#!/usr/bin/env bash
# =============================================================================
# wire-up-sheets-newsletter.sh
# -----------------------------------------------------------------------------
# Creates a standalone Apps Script that lazily creates its own Google Sheet,
# deploys it as a Web App, and wires the resulting URL into Vercel as
# GOOGLE_SHEETS_WEBHOOK_URL.
#
# Why not call the Sheets API directly to create the Sheet up-front? clasp's
# default OAuth client lives in a shared GCP project where the Sheets API is
# NOT enabled — and we can't toggle APIs on a project we don't own. So we
# avoid the Sheets API entirely: SpreadsheetApp.create() runs INSIDE the
# Apps Script (Apps Script API is per-user and the user already enabled it).
#
# Steps:
#   1. Preflight checks
#   2. Refresh clasp access token
#   3. Inject PROJECT_NAME into Code.gs and stage in a temp dir
#   4. clasp create --type standalone
#   5. clasp push
#   6. clasp deploy → parse deployment ID → webhook URL
#   7. vercel env add GOOGLE_SHEETS_WEBHOOK_URL (production)
#   8. vercel --prod
#
# After this script finishes, the user opens the Apps Script editor (URL is
# printed) and clicks Run > setupAndCreate ONCE — this authorizes the
# SpreadsheetApp + Drive scopes and creates the Sheet. Subsequent POSTs from
# /api/subscribe then succeed anonymously.
# =============================================================================

set -euo pipefail

# ---- Pretty output ---------------------------------------------------------
BOLD=$(tput bold 2>/dev/null || true)
DIM=$(tput dim 2>/dev/null || true)
RESET=$(tput sgr0 2>/dev/null || true)
GREEN=$(tput setaf 2 2>/dev/null || true)
RED=$(tput setaf 1 2>/dev/null || true)
CYAN=$(tput setaf 6 2>/dev/null || true)
YELLOW=$(tput setaf 3 2>/dev/null || true)

step()  { echo "${BOLD}${CYAN}[$1]${RESET} $2"; }
ok()    { echo "${GREEN}  ✓${RESET} $1"; }
warn()  { echo "${YELLOW}  ⚠${RESET} $1"; }
fail()  { echo "${RED}  ✗${RESET} $1" >&2; exit 1; }
note()  { echo "${DIM}    $1${RESET}"; }

# ---- Preflight -------------------------------------------------------------
step "1/7" "Preflight"
for cmd in clasp vercel jq curl node; do
  command -v "$cmd" >/dev/null 2>&1 || fail "$cmd not found in PATH"
done
ok "clasp $(clasp --version 2>&1 | head -1)"
ok "vercel $(vercel --version | head -1)"
ok "jq $(jq --version)"

CLASP_CREDS="$HOME/.clasprc.json"
[[ -f "$CLASP_CREDS" ]] || fail "Run 'clasp login' first ($CLASP_CREDS missing)"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

[[ -f package.json ]] || fail "package.json not found — run from a project root"
PKG_NAME=$(node -p "require('./package.json').name")
PROJECT_NAME="${PROJECT_NAME:-$PKG_NAME}"
ok "Project: $PROJECT_NAME"

HANDLER_DIR="$PROJECT_ROOT/scripts/sheets-newsletter"
[[ -f "$HANDLER_DIR/Code.gs" ]] || fail "Missing $HANDLER_DIR/Code.gs"
[[ -f "$HANDLER_DIR/appsscript.json" ]] || fail "Missing $HANDLER_DIR/appsscript.json"

DEPLOY_MANIFEST="$HANDLER_DIR/.deployment.json"

# ---- Step 2: refresh access token (warm up clasp) --------------------------
step "2/7" "Refreshing clasp access token"
clasp list-deployments >/dev/null 2>&1 || clasp list-scripts >/dev/null 2>&1 || true
ACCESS_TOKEN=$(jq -r '.tokens.default.access_token // .token.access_token // empty' "$CLASP_CREDS")
[[ -n "$ACCESS_TOKEN" ]] || fail "Could not read access token from $CLASP_CREDS"
ok "Access token acquired"

# ---- Step 3: stage handler files with PROJECT_NAME injected ----------------
step "3/7" "Staging handler code"
WORK_DIR="$(mktemp -d -t sheets-newsletter-XXXX)"
trap 'rm -rf "$WORK_DIR"' EXIT

# Inject PROJECT_NAME into Code.gs by rewriting the var declaration
PROJECT_NAME_ESCAPED=$(printf '%s' "$PROJECT_NAME" | sed 's/[\/&]/\\&/g')
sed "s|^var PROJECT_NAME = .*|var PROJECT_NAME = \"$PROJECT_NAME_ESCAPED\";|" \
  "$HANDLER_DIR/Code.gs" > "$WORK_DIR/Code.gs"
cp "$HANDLER_DIR/appsscript.json" "$WORK_DIR/appsscript.json"
ok "Staged in $WORK_DIR"
note "PROJECT_NAME injected: $PROJECT_NAME"

# ---- Step 4: bind a standalone Apps Script ---------------------------------
step "4/7" "Creating standalone Apps Script"
(
  cd "$WORK_DIR"
  # --type standalone creates a script independent of any container Sheet.
  # The Sheet is created lazily by setupAndCreate() from inside Apps Script.
  clasp create --type standalone \
    --title "$PROJECT_NAME — newsletter webhook" \
    --rootDir . \
    > /tmp/clasp-create.log 2>&1 || {
      cat /tmp/clasp-create.log >&2
      exit 1
    }
)
SCRIPT_ID=$(jq -r '.scriptId' "$WORK_DIR/.clasp.json")
[[ -n "$SCRIPT_ID" && "$SCRIPT_ID" != "null" ]] || fail "Failed to capture scriptId"
ok "Script ID: $SCRIPT_ID"
note "Editor URL: https://script.google.com/d/$SCRIPT_ID/edit"

# ---- Step 5: push code -----------------------------------------------------
step "5/7" "Pushing handler code"
( cd "$WORK_DIR" && clasp push --force > /tmp/clasp-push.log 2>&1 ) || {
  cat /tmp/clasp-push.log >&2
  fail "clasp push failed"
}
ok "Code pushed"

# ---- Step 6: deploy as Web App ---------------------------------------------
step "6/7" "Deploying as Web App"
DEPLOY_OUT=$( cd "$WORK_DIR" && clasp deploy --description "auto-$(date +%Y%m%d-%H%M%S)" 2>&1 ) || {
  echo "$DEPLOY_OUT" >&2
  fail "clasp deploy failed"
}
echo "$DEPLOY_OUT" | sed 's/^/    /'

# Parse deployment ID. Format varies across clasp versions; deployment IDs
# are typically 57-character base64-ish strings.
DEPLOYMENT_ID=$(echo "$DEPLOY_OUT" \
  | grep -oE '[A-Za-z0-9_-]{40,}' \
  | grep -v "$SCRIPT_ID" \
  | head -1 || true)
[[ -n "$DEPLOYMENT_ID" ]] || { echo "$DEPLOY_OUT" >&2; fail "Could not parse deployment ID"; }
WEBHOOK_URL="https://script.google.com/macros/s/$DEPLOYMENT_ID/exec"
ok "Deployment ID: $DEPLOYMENT_ID"
ok "Web App URL:   $WEBHOOK_URL"

# ---- Step 7: wire to Vercel ------------------------------------------------
step "7/7" "Wiring GOOGLE_SHEETS_WEBHOOK_URL into Vercel + production redeploy"
if [[ ! -f "$PROJECT_ROOT/.vercel/project.json" ]]; then
  note "No .vercel/ — running 'vercel link' first"
  vercel link --yes || fail "vercel link failed"
fi
# Remove any pre-existing value so we don't end up with a stale entry.
vercel env rm GOOGLE_SHEETS_WEBHOOK_URL production --yes >/dev/null 2>&1 || true
# Pipe the value in to avoid the interactive prompt.
printf "%s" "$WEBHOOK_URL" | vercel env add GOOGLE_SHEETS_WEBHOOK_URL production
ok "GOOGLE_SHEETS_WEBHOOK_URL set (production)"

vercel --prod --yes
ok "Production redeploy queued"

# ---- Persist manifest ------------------------------------------------------
cat > "$DEPLOY_MANIFEST" <<JSON
{
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "projectName": "$PROJECT_NAME",
  "scriptId": "$SCRIPT_ID",
  "deploymentId": "$DEPLOYMENT_ID",
  "webhookUrl": "$WEBHOOK_URL",
  "note": "Sheet is lazily created by setupAndCreate() inside Apps Script. Sheet ID is stored in ScriptProperties of the Apps Script project."
}
JSON
ok "Manifest written to scripts/sheets-newsletter/.deployment.json"

# ---- One-time authorization nudge ------------------------------------------
EDITOR_URL="https://script.google.com/d/$SCRIPT_ID/edit"
echo
echo "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo "${BOLD}${YELLOW}One last manual step — required by Apps Script's executeAs:USER_DEPLOYING:${RESET}"
echo
echo "  1. The Apps Script editor will open in your browser shortly."
echo "  2. In the function dropdown (top toolbar), pick ${BOLD}setupAndCreate${RESET}."
echo "  3. Click ${BOLD}▶ Run${RESET}."
echo "  4. The OAuth consent dialog asks to manage Spreadsheets / Drive files."
echo "     Click ${BOLD}Advanced${RESET} → ${BOLD}Go to <project> (unsafe)${RESET} → ${BOLD}Allow${RESET}."
echo "  5. The Sheet is created and its ID is saved. Done — POSTs work now."
echo
echo "  Opening editor: $EDITOR_URL"
echo "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
( command -v open >/dev/null 2>&1 && open "$EDITOR_URL" ) || true
echo
echo "${BOLD}Summary${RESET}"
echo "  Script:       $EDITOR_URL"
echo "  Webhook:      $WEBHOOK_URL"
echo "  Vercel env:   GOOGLE_SHEETS_WEBHOOK_URL=<webhook> (production)"
echo
echo "${BOLD}Test after Run > setupAndCreate finishes:${RESET}"
echo "  curl -sS -X POST $WEBHOOK_URL \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"email\":\"you@example.com\"}'"
echo
echo "${BOLD}Or via your production API:${RESET}"
echo "  curl -sS -X POST https://artemis-tokyo.vercel.app/api/subscribe \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"email\":\"you@example.com\"}'"
echo
echo "${GREEN}${BOLD}✓ All automated steps complete.${RESET}"
