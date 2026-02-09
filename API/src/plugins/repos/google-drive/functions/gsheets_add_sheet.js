const { utils } = require("./utils");

module.exports = {
  async gsheets_add_sheet(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.spreadsheetId || !d.title) return { ok: false, error: "Missing spreadsheetId or title." };
    const res = await utils.googleRequest(opts, `${utils.SHEETS_API}/${d.spreadsheetId}:batchUpdate`, {
      method: "POST",
      body: { requests: [{ addSheet: { properties: { title: d.title } } }] }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const props = res.data.replies?.[0]?.addSheet?.properties || {};
    return { ok: true, sheetId: props.sheetId || 0, title: props.title || d.title, index: props.index || 0, rowCount: props.gridProperties?.rowCount || 1000, columnCount: props.gridProperties?.columnCount || 26 };
  }
};
