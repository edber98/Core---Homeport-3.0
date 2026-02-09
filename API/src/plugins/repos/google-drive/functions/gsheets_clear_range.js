const { utils } = require("./utils");

module.exports = {
  async gsheets_clear_range(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.spreadsheetId || !d.range) return { ok: false, error: "Missing spreadsheetId or range." };
    const res = await utils.googleRequest(opts, `${utils.SHEETS_API}/${d.spreadsheetId}/values/${encodeURIComponent(d.range)}:clear`, { method: "POST", body: {} });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "cleared", updatedRange: res.data.clearedRange || d.range, updatedRows: 0 };
  }
};
