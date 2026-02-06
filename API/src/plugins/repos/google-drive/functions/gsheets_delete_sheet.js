const { utils } = require("./utils");

module.exports = {
  async gsheets_delete_sheet(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.spreadsheetId || d.sheetId === undefined) return { ok: false, error: "Missing spreadsheetId or sheetId." };
    const res = await utils.googleRequest(opts, `${utils.SHEETS_API}/${d.spreadsheetId}:batchUpdate`, {
      method: "POST",
      body: { requests: [{ deleteSheet: { sheetId: Number(d.sheetId) } }] }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "deleted", updatedRange: "", updatedRows: 0 };
  }
};
