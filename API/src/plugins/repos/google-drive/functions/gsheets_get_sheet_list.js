const { utils } = require("./utils");

module.exports = {
  async gsheets_get_sheet_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.spreadsheetId) return { ok: false, error: "Missing spreadsheetId." };
    log('Récupération de la liste...');
    const res = await utils.googleRequest(opts, `${utils.SHEETS_API}/${d.spreadsheetId}?fields=sheets.properties`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const sheets = (res.data.sheets || []).map(s => ({
      sheetId: s.properties?.sheetId || 0,
      title: s.properties?.title || "",
      index: s.properties?.index || 0,
      rowCount: s.properties?.gridProperties?.rowCount || 0,
      columnCount: s.properties?.gridProperties?.columnCount || 0
    }));
    return { ok: true, sheets , totalCount: sheets.length };
  }
};
