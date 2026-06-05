#!/usr/bin/env bash
# =============================================================================
# update-sheets-newsletter.sh
# -----------------------------------------------------------------------------
# Re-pushes scripts/sheets-newsletter/Code.gs to the SAME Apps Script created
# by wire-up-sheets-newsletter.sh, and creates a new deployment VERSION at the
# SAME deployment ID. The webhook URL is preserved, so no Vercel env update.
#
# Use whenever you edit Code.gs locally and want the change in production
# without re-creating the Sheet / Script / Vercel binding.
# =============================================================================

set -euo pipefail

BOLD=$(tput bold 2>/dev/null || true); RESET=$(tput sgr0 2>/dev/null || true)
GREEN=$(tput setaf 2 2>/dev/null || true); RED=$(tput setaf 1 2>/dev/null || true)
step()  { echo "${BOLD}[$1]${RESET} $2"; }
fail()  { echo "${RED}  ✗${RESET} $1" >&2; exit 1; }
ok()    { echo "${GREEN}  ✓${RESET} $1"; }

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

HANDLER_DIR="$PROJECT_ROOT/scripts/sheets-newsletter"
MANIFEST="$HANDLER_DIR/.deployment.json"
[[ -f "$MANIFEST" ]] || fail "No prior deployment — run 'npm run wire-sheets' first"

SCRIPT_ID=$(jq -r '.scriptId' "$MANIFEST")
DEPLOYMENT_ID=$(jq -r '.deploymentId' "$MANIFEST")
[[ -n "$SCRIPT_ID" && "$SCRIPT_ID" != "null" ]] || fail "Manifest missing scriptId"

step "1/3" "Materializing working tree"
WORK_DIR="$(mktemp -d -t sheets-newsletter-XXXX)"
trap 'rm -rf "$WORK_DIR"' EXIT
cp "$HANDLER_DIR/Code.gs" "$HANDLER_DIR/appsscript.json" "$WORK_DIR/"
# Re-create .clasp.json pointing at the existing script
cat > "$WORK_DIR/.clasp.json" <<JSON
{"scriptId":"$SCRIPT_ID","rootDir":"$WORK_DIR"}
JSON
ok "tree ready"

step "2/3" "Pushing latest Code.gs"
( cd "$WORK_DIR" && clasp push --force ) || fail "clasp push failed"
ok "pushed"

step "3/3" "Re-deploying $DEPLOYMENT_ID"
( cd "$WORK_DIR" && clasp deploy --deploymentId "$DEPLOYMENT_ID" --description "update-$(date +%Y%m%d-%H%M%S)" ) \
  || fail "clasp deploy failed"
ok "deployment $DEPLOYMENT_ID bumped"

WEBHOOK_URL=$(jq -r '.webhookUrl' "$MANIFEST")
echo
echo "${GREEN}${BOLD}✓ Done.${RESET} URL unchanged: $WEBHOOK_URL"
