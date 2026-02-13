const { utils } = require("./utils");

module.exports = {
  async gsheets_copy_sheet(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.spreadsheetId || d.sheetId === undefined || !d.destinationSpreadsheetId) return { ok: false, error: "Missing spreadsheetId, sheetId, or destinationSpreadsheetId." };
    log('Appel API en cours...');
    const res = await utils.googleRequest(opts, `${utils.SHEETS_API}/${d.spreadsheetId}/sheets/${d.sheetId}:copyTo`, {
      method: "POST",
      body: { destinationSpreadsheetId: d.destinationSpreadsheetId }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, sheetId: res.data.sheetId || 0, title: res.data.title || "", index: res.data.index || 0, rowCount: res.data.gridProperties?.rowCount || 0, columnCount: res.data.gridProperties?.columnCount || 0 };
  }
};
