const { utils } = require("./utils");

module.exports = {
  async gsheets_update_values(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.spreadsheetId || !d.range) return { ok: false, error: "Missing spreadsheetId or range." };
    let values = d.values;
    if (typeof values === "string") { try { values = JSON.parse(values); } catch { return { ok: false, error: "Invalid JSON for values." }; } }
    log('Mise à jour en cours...');
    const res = await utils.googleRequest(opts, `${utils.SHEETS_API}/${d.spreadsheetId}/values/${encodeURIComponent(d.range)}?valueInputOption=USER_ENTERED`, {
      method: "PUT",
      body: { range: d.range, majorDimension: "ROWS", values }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "updated", updatedRange: res.data.updatedRange, updatedRows: res.data.updatedRows || 0 };
  }
};
