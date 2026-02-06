const { utils } = require("./utils");

module.exports = {
  async shopify_orders_count(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.status) query.status = d.status;
    const res = await utils.shopifyRequest(opts, "/orders/count.json", { query });
    if (!res.ok) return res;
    return { ok: true, status: "success", message: String((res.data && res.data.count) || 0) };
  }
};
