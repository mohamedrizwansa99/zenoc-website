/**
 * ZENOC contact form -> Google Sheets
 *
 * Setup:
 * 1. Open the Google Sheet that should collect enquiries.
 * 2. Extensions > Apps Script.
 * 3. Replace the editor contents with this code and Save.
 * 4. Deploy > New deployment > Web app.
 *    Execute as: Me
 *    Who has access: Anyone
 * 5. Copy the Web app URL ending in /exec into GOOGLE_SCRIPT_URL in script.js.
 */
function doPost(e) {
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    // Quietly ignore bot submissions caught by the hidden honeypot.
    if (data.website) return jsonResponse({ ok: true });

    var name = clean(data.name, 120);
    var email = clean(data.email, 200);
    var service = clean(data.service, 160);
    var message = clean(data.message, 5000);

    if (!name || !email || !service || !message) {
      return jsonResponse({ ok: false, error: "Missing required fields" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ ok: false, error: "Invalid email address" });
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Enquiries");
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("Enquiries");
    }

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Submitted At", "Name", "Email", "Service", "Project Details"]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, 5).setFontWeight("bold");
    }

    sheet.appendRow([new Date(), name, email, service, message]);
    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

function clean(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function jsonResponse(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
