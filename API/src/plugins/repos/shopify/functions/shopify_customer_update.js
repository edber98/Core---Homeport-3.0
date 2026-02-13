const { utils } = require("./utils");

module.exports = {
  async shopify_customer_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.customerId) return { ok: false, error: "Missing customerId." };
    const customer = {};
    if (d.email) customer.email = d.email;
    if (d.first_name) customer.first_name = d.first_name;
    if (d.last_name) customer.last_name = d.last_name;
    if (d.phone) customer.phone = d.phone;
    log('Mise à jour en cours...');
    const res = await utils.shopifyRequest(opts, `/customers/${d.customerId}.json`, { method: "PUT", body: { customer } });
    if (!res.ok) return res;
    const c = res.data.customer || {};
    return { ok: true, id: String(c.id), email: c.email || "", first_name: c.first_name || "", last_name: c.last_name || "", phone: c.phone || "", orders_count: String(c.orders_count || 0), total_spent: c.total_spent || "", created_at: c.created_at || "" };
  }
};
