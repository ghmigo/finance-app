// Container-bound Apps Script for the "Finance Tracker" sheet.
// Receives rows from the Vercel app and appends them to the Log tab.
// Setup: see README, "Google Sheet sync".

const LOG_SHEET = 'Log';
const ID_COL = 6; // column F

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const body = JSON.parse(e.postData.contents);
    const secret = PropertiesService.getScriptProperties().getProperty('SECRET');
    if (!secret || body.secret !== secret) return out({ ok: false, error: 'unauthorized' });

    const sheet = SpreadsheetApp.getActive().getSheetByName(LOG_SHEET);
    if (body.action === 'delete') return out({ ok: true, removed: removeById(sheet, body.id) });

    const rows = body.action === 'bulk' ? body.rows : [body];
    return out({ ok: true, added: addRows(sheet, rows) });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return out({ ok: true, service: 'finance-sheet-sync' });
}

function addRows(sheet, rows) {
  const last = sheet.getLastRow();
  const known = new Set();
  if (last >= 2) {
    sheet.getRange(2, ID_COL, last - 1, 1).getValues().forEach(function (r) { known.add(String(r[0])); });
  }
  const fresh = rows.filter(function (r) { return r.id && !known.has(String(r.id)); });
  if (fresh.length === 0) return 0;
  const values = fresh.map(function (r) {
    return [new Date(r.date), r.category, Number(r.amount), r.place || '', r.note || '', "'" + r.id];
  });
  sheet.getRange(last + 1, 1, values.length, 6).setValues(values);
  return values.length;
}

function removeById(sheet, id) {
  const last = sheet.getLastRow();
  if (!id || last < 2) return 0;
  const hit = sheet.getRange(2, ID_COL, last - 1, 1)
    .createTextFinder(String(id)).matchEntireCell(true).findNext();
  if (!hit) return 0;
  sheet.deleteRow(hit.getRow());
  return 1;
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
