const { utils } = require("./utils");

module.exports = {
  async shopify_customer_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.customerId) return { ok: false, error: "Missing customerId." };
    const res = await utils.shopifyRequest(opts, `/customers/${d.customerId}.json`);
    if (!res.ok) return res;
    const c = res.data.customer || {};
    return { ok: true, id: String(c.id), email: c.email || "", first_name: c.first_name || "", last_name: c.last_name || "", phone: c.phone || "", orders_count: String(c.orders_count || 0), total_spent: c.total_spent || "", created_at: c.created_at || "" };
  }
};
