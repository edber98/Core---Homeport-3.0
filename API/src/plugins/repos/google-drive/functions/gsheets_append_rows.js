const { utils } = require("./utils");

module.exports = {
  async gsheets_append_rows(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.spreadsheetId || !d.range) return { ok: false, error: "Missing spreadsheetId or range." };
    let values = d.values;
    if (typeof values === "string") { try { values = JSON.parse(values); } catch { return { ok: false, error: "Invalid JSON for values." }; } }
    const res = await utils.googleRequest(opts, `${utils.SHEETS_API}/${d.spreadsheetId}/values/${encodeURIComponent(d.range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
      method: "POST",
      body: { range: d.range, majorDimension: "ROWS", values }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "appended", updatedRange: res.data.updates?.updatedRange || "", updatedRows: res.data.updates?.updatedRows || 0 };
  }
};
