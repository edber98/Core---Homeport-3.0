const { utils } = require("./utils");

module.exports = {
  async shopify_fulfillments_list(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.orderId) return { ok: false, error: "Missing orderId." };
    const query = {};
    if (d.limit) query.limit = d.limit;
    const res = await utils.shopifyRequest(opts, `/orders/${d.orderId}/fulfillments.json`, { query });
    if (!res.ok) return res;
    const items = (res.data && res.data.fulfillments) || [];
    const fulfillments = items.map(f => ({ id: String(f.id), order_id: String(f.order_id || ""), status: f.status || "", tracking_number: f.tracking_number || "", tracking_url: f.tracking_url || "", created_at: f.created_at || "" }));
    return { ok: true, fulfillments, totalCount: fulfillments.length };
  }
};
