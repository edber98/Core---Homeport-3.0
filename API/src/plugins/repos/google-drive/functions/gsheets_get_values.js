const { utils } = require("./utils");

module.exports = {
  async gsheets_get_values(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.spreadsheetId || !d.range) return { ok: false, error: "Missing spreadsheetId or range." };
    log('Récupération des données...');
    const res = await utils.googleRequest(opts, `${utils.SHEETS_API}/${d.spreadsheetId}/values/${encodeURIComponent(d.range)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, range: res.data.range, majorDimension: res.data.majorDimension || "ROWS", values: JSON.stringify(res.data.values || []) };
  }
};
