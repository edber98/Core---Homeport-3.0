const { utils } = require("./utils");

function toInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

module.exports = {
  async odoo_purchase_order_lines_list(node, msg, inputs, opts) {
    const data = inputs || {};
    const limit = toInt(data.limit) || 100;
    const domain = [];
    if (toInt(data.order_id)) domain.push(["order_id", "=", toInt(data.order_id)]);
    if (toInt(data.product_id)) domain.push(["product_id", "=", toInt(data.product_id)]);

    const res = await utils.odooCall(opts, "purchase.order.line", "search_read", [], { domain, limit });
    if (!res.ok) return res;
    const countRes = await utils.odooCall(opts, "purchase.order.line", "search_count", [], { domain });
    if (!countRes.ok) return countRes;
    return { ok: true, lines: res.data, totalCount: countRes.data || 0 };
  }
};
