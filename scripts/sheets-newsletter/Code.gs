/* =============================================================================
   Google Apps Script — Newsletter signups → Spreadsheet row
   =============================================================================
   Deployed as a Web App by `scripts/wire-up-sheets-newsletter.sh` as a
   STANDALONE script (not container-bound). The Sheet is created lazily from
   INSIDE Apps Script via SpreadsheetApp.create(), so the orchestration never
   needs to call the Sheets API directly — that matters because clasp's
   default OAuth client lives in a shared GCP project where Sheets API isn't
   enabled.

   Sheet ID is persisted in ScriptProperties so the same Sheet is reused
   across calls. If the Sheet is deleted, a new one is auto-created.

   Authorization model:
     - Web App deployed with executeAs:USER_DEPLOYING + access:ANYONE_ANONYMOUS
     - On first invocation, the deployer (you) must authorize SpreadsheetApp
       and Drive scopes. The orchestration script opens the editor and
       prompts you to click Run > setupAndCreate once.

   Sheet shape (auto-initialized at create time):
     A: Timestamp (ISO)
     B: Email
     C: Source
     D: User-Agent
   ============================================================================= */

/** Replaced at deploy time by the orchestration script — kept as a constant
 *  so the title of the auto-created Sheet matches the project. */
var PROJECT_NAME = "AITECH TOKYO";

/** Pragmatic RFC-5321-ish validator. Mirrors src/app/api/subscribe/route.ts. */
function isValidEmail(addr) {
  if (typeof addr !== "string") return false;
  if (addr.length === 0 || addr.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(addr);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Lazy Sheet bootstrap. Idempotent: returns the same Sheet across calls
 *  by stashing its ID in ScriptProperties. */
function getOrCreateSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty("SHEET_ID");

  if (sheetId) {
    try {
      return SpreadsheetApp.openById(sheetId);
    } catch (e) {
      // Sheet was trashed — fall through and create a new one
      props.deleteProperty("SHEET_ID");
    }
  }

  var title = PROJECT_NAME + " — Newsletter Subscribers";
  var ss = SpreadsheetApp.create(title);
  var sheet = ss.getActiveSheet();
  sheet.setName("Subscribers");
  sheet.appendRow(["Timestamp (ISO)", "Email", "Source", "User-Agent"]);
  sheet.setFrozenRows(1);
  sheet.getRange("A1:D1").setFontWeight("bold");
  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 280);
  sheet.setColumnWidth(3, 160);
  sheet.setColumnWidth(4, 280);
  props.setProperty("SHEET_ID", ss.getId());
  return ss;
}

/** Entry point the user runs ONCE from the Apps Script editor to:
 *   1. Grant the OAuth scopes (SpreadsheetApp + Drive.file) — required
 *      because executeAs:USER_DEPLOYING needs the deployer's authorization
 *   2. Create the Sheet (saving the ID to ScriptProperties)
 *  After this, anonymous POSTs to the Web App succeed without further prompts. */
function setupAndCreate() {
  var ss = getOrCreateSpreadsheet();
  var url = ss.getUrl();
  Logger.log("Sheet ready: " + url);
  return { sheetUrl: url, sheetId: ss.getId() };
}

function emailExists(sheet, email) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  var values = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  var lower = String(email).toLowerCase();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).toLowerCase() === lower) return true;
  }
  return false;
}

function doPost(e) {
  try {
    var payload = {};
    try {
      payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    } catch (parseErr) {
      return jsonResponse({ success: false, error: "invalid_json" });
    }

    var email = typeof payload.email === "string"
      ? payload.email.trim().toLowerCase()
      : "";
    if (!isValidEmail(email)) {
      return jsonResponse({ success: false, error: "invalid_email" });
    }

    var ss = getOrCreateSpreadsheet();
    var sheet = ss.getSheetByName("Subscribers") || ss.getActiveSheet();

    if (emailExists(sheet, email)) {
      return jsonResponse({ success: false, error: "duplicate" });
    }

    sheet.appendRow([
      new Date().toISOString(),
      email,
      String(payload.source || ""),
      String(payload.userAgent || "")
    ]);

    return jsonResponse({ success: true, provider: "google-sheets" });
  } catch (err) {
    console.error("doPost crashed:", err && err.stack ? err.stack : err);
    return jsonResponse({ success: false, error: "server_error" });
  }
}

/** GET ping — sanity check + reports the Sheet URL once it exists. */
function doGet() {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty("SHEET_ID");
  var sheetUrl = null;
  if (sheetId) {
    try {
      sheetUrl = SpreadsheetApp.openById(sheetId).getUrl();
    } catch (e) {
      sheetUrl = null;
    }
  }
  return jsonResponse({
    ok: true,
    service: "newsletter-webhook",
    project: PROJECT_NAME,
    sheetId: sheetId,
    sheetUrl: sheetUrl,
    initialized: Boolean(sheetUrl),
    expectedPostBody: { email: "string", source: "string?", userAgent: "string?" }
  });
}
