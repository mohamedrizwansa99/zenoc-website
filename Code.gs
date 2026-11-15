/**
 * ZENOC enquiry receiver — Google Apps Script Web App
 *
 * Supports:
 *   GET  /exec  -> health check and spreadsheet link
 *   POST /exec -> append contact enquiry to the "Enquiries" tab
 *
 * Recommended setup:
 * 1. Open the Google Sheet you want to use.
 * 2. Extensions > Apps Script. Replace the editor contents with this file.
 * 3. Save, then Deploy > Manage deployments > Edit (pencil) > New version.
 * 4. Execute as: Me. Who has access: Anyone. Click Deploy.
 * 5. Copy the Web app URL ending in /exec into script.js.
 *
 * If this is a standalone Apps Script project (not opened from a Sheet),
 * set SPREADSHEET_ID below to the ID from the Google Sheet URL.
 */
const SPREADSHEET_ID = ""; // Optional: paste the Sheet ID between the quotes.

function doGet() {
  try {
    const sheet = getEnquiriesSheet_();
    const ss = sheet.getParent();
    return json_({
      ok: true,
      service: "ZENOC Enquiries",
      status: "ready",
      spreadsheet: ss.getUrl(),
      sheet: sheet.getName()
    });
  } catch (err) {
    return json_({
      ok: false,
      service: "ZENOC Enquiries",
      error: String(err)
    });
  }
}

function doPost(e) {
  try {
    const data = readPayload_(e);

    // Spam honeypot: silently accept, but do not store.
    if (clean_(data.website, 200)) {
      return json_({ ok: true, ignored: true });
    }

    const name = clean_(data.name, 120);
    const email = clean_(data.email, 200);
    const service = clean_(data.service, 160);
    const message = clean_(data.message, 5000);

    if (!name || !email || !service || !message) {
      return json_({ ok: false, error: "Please complete all required fields." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json_({ ok: false, error: "Please enter a valid email address." });
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      const sheet = getEnquiriesSheet_();
      sheet.appendRow([
        new Date(),
        safeCell_(name),
        safeCell_(email),
        safeCell_(service),
        safeCell_(message)
      ]);
    } finally {
      lock.releaseLock();
    }

    return json_({ ok: true, message: "Enquiry saved." });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: String(err) });
  }
}

function readPayload_(e) {
  if (e && e.parameter && Object.keys(e.parameter).length) {
    return e.parameter;
  }
  const raw = e && e.postData && e.postData.contents ? e.postData.contents : "";
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (_) {
    const result = {};
    raw.split("&").forEach(function (pair) {
      const parts = pair.split("=");
      const key = decodeURIComponent((parts.shift() || "").replace(/\+/g, " "));
      const value = decodeURIComponent(parts.join("=").replace(/\+/g, " "));
      result[key] = value;
    });
    return result;
  }
}

function getEnquiriesSheet_() {
  let ss = null;
  if (SPREADSHEET_ID.trim()) {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID.trim());
  } else {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  // If this project was created at script.google.com rather than from a
  // spreadsheet, create a dedicated spreadsheet and remember its ID.
  if (!ss) {
    const props = PropertiesService.getScriptProperties();
    const savedId = props.getProperty("ZENOC_SPREADSHEET_ID");
    if (savedId) {
      ss = SpreadsheetApp.openById(savedId);
    } else {
      ss = SpreadsheetApp.create("ZENOC Enquiries");
      props.setProperty("ZENOC_SPREADSHEET_ID", ss.getId());
    }
  }

  let sheet = ss.getSheetByName("Enquiries");
  if (!sheet) sheet = ss.insertSheet("Enquiries");

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Submitted At", "Name", "Email", "Service", "Project Details"]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 5).setFontWeight("bold");
  }
  return sheet;
}

function clean_(value, maxLength) {
  return String(value == null ? "" : value).trim().slice(0, maxLength);
}

// Prevent user-entered text from being interpreted as a spreadsheet formula.
function safeCell_(value) {
  return /^[=+\-@]/.test(value) ? "'" + value : value;
}

function json_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
