const { utils } = require("./utils");

module.exports = {
  async semrush_units_balance(node, msg, inputs, opts) {
    const res = await utils.semrushRequest(opts, { type: "api_units" });
    if (!res.ok) return res;
    return { ok: true, totalCount: String(res.rows.length), rows: res.rows, raw: res.text };
  }
};
