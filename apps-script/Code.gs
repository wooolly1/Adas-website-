/**
 * ADAS Architecture — Bookings backend (Google Apps Script Web App)
 * ----------------------------------------------------------------------------
 * Stores every confirmed booking as a row in a Google Sheet and exposes the
 * taken slots so the website can grey them out across all services.
 *
 * SETUP (one time, ~5 minutes):
 *  1. Create a new Google Sheet (sheet.new). Name the first tab "Bookings".
 *  2. Extensions → Apps Script. Delete the placeholder, paste this whole file.
 *  3. Save. Run the function `setup` once (Run ▸ setup) and authorise access.
 *  4. Deploy → New deployment → type "Web app".
 *       - Execute as: Me
 *       - Who has access: Anyone
 *     Deploy, copy the "Web app URL" (ends with /exec).
 *  5. Paste that URL into BOOKINGS_API in app.jsx and bump the cache version.
 *
 * Re-deploy (Manage deployments → edit → new version) whenever you change this.
 */

var SHEET_NAME = 'Bookings';

var HEADERS = [
  'Timestamp', 'Status', 'Service', 'Track', 'Package', 'Fee', 'Currency',
  'Engineer', 'EngineerId', 'Engineer Email',
  'Date', 'Time', 'Week',
  'Name', 'Email', 'Phone', 'Company', 'Payment Method', 'Message',
];

/** Run once from the editor to create the tab + header row. */
function setup() {
  var sheet = sheet_();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
}

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** GET → { ok, slots: [{ date, time, week, engineerId }] } for taken slots. */
function doGet() {
  var sheet = sheet_();
  var last = sheet.getLastRow();
  if (last < 2) return json_({ ok: true, slots: [] });

  var rows = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  var col = {};
  HEADERS.forEach(function (h, i) { col[h] = i; });

  var slots = rows
    .filter(function (r) {
      var status = String(r[col['Status']] || '').toLowerCase();
      return status !== 'cancelled' && status !== 'canceled';
    })
    .map(function (r) {
      return {
        date: String(r[col['Date']] || ''),
        time: String(r[col['Time']] || ''),
        week: String(r[col['Week']] || ''),
        engineerId: String(r[col['EngineerId']] || ''),
      };
    });

  return json_({ ok: true, slots: slots });
}

/**
 * POST (Content-Type text/plain to dodge CORS preflight) with a JSON booking.
 * Appends a row and returns { ok: true }.
 */
function doPost(e) {
  try {
    var b = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    setup(); // ensure headers exist
    var sheet = sheet_();
    sheet.appendRow([
      new Date(),
      'confirmed',
      b.serviceName || b.serviceId || '',
      b.track || '',
      b.packageLabel || '',
      b.fee || '',
      b.currency || 'SAR',
      b.engineerName || '',
      b.engineerId || '',
      b.engineerEmail || '',
      b.date || '',
      b.time || '',
      b.week || '',
      b.name || '',
      b.email || '',
      b.phone || '',
      b.company || '',
      b.payMethod || '',
      b.message || '',
    ]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}
