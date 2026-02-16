const { utils } = require("./utils");

module.exports = {
  async shopify_customers_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {};
    if (d.limit) query.limit = d.limit;
    if (d.since_id) query.since_id = d.since_id;
    log('Récupération de la liste...');
    const res = await utils.shopifyRequest(opts, "/customers.json", { query });
    if (!res.ok) return res;
    const items = (res.data && res.data.customers) || [];
    const customers = items.map(c => ({ id: String(c.id), email: c.email || "", first_name: c.first_name || "", last_name: c.last_name || "", phone: c.phone || "", orders_count: String(c.orders_count || 0), total_spent: c.total_spent || "", created_at: c.created_at || "" }));
    return { ok: true, customers, totalCount: customers.length };
  }
};
