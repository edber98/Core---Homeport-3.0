const { utils } = require("./utils");

module.exports = {
  async gsheets_get_spreadsheet(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.spreadsheetId) return { ok: false, error: "Missing spreadsheetId." };
    const res = await utils.googleRequest(opts, `${utils.SHEETS_API}/${d.spreadsheetId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const s = res.data;
    return { ok: true, spreadsheetId: s.spreadsheetId, title: s.properties?.title, url: s.spreadsheetUrl, sheetId: String(s.sheets?.[0]?.properties?.sheetId || 0), sheetTitle: s.sheets?.[0]?.properties?.title || "" };
  }
};
