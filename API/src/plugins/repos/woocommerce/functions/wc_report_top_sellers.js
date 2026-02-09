const { utils } = require("./utils");

module.exports = {
  async wc_report_top_sellers(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.date_min) query.date_min = d.date_min;
    if (d.date_max) query.date_max = d.date_max;
    const res = await utils.wcRequest(opts, "/reports/top_sellers", { query });
    if (!res.ok) return res;
    return { ok: true, total_sales: "", total_orders: "", total_items: String(Array.isArray(res.data) ? res.data.length : 0) };
  }
};
