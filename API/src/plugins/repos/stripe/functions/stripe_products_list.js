const { utils } = require("./utils");

module.exports = {
  async stripe_products_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.limit) query.limit = d.limit;
    if (d.starting_after) query.starting_after = d.starting_after;
    if (d.active !== undefined && d.active !== null && d.active !== "") query.active = String(d.active);
    const res = await utils.stripeRequest(opts, "/products", { query });
    if (!res.ok) return res;
    const items = (res.data && res.data.data) || [];
    const products = items.map(p => ({
      id: p.id, name: p.name, description: p.description,
      active: p.active, created: p.created
    }));
    return { ok: true, products };
  }
};
