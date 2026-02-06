const { utils } = require("./utils");

module.exports = {
  async wc_report_sales(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.date_min) query.date_min = d.date_min;
    if (d.date_max) query.date_max = d.date_max;
    const res = await utils.wcRequest(opts, "/reports/sales", { query });
    if (!res.ok) return res;
    const items = Array.isArray(res.data) ? res.data : [];
    const r = items[0] || {};
    return { ok: true, total_sales: r.total_sales || "0", total_orders: String(r.total_orders || 0), total_items: String(r.total_items || 0) };
  }
};
