const { utils } = require("./utils");

module.exports = {
  async shopify_inventory_levels_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {};
    if (d.inventory_item_ids) query.inventory_item_ids = d.inventory_item_ids;
    if (d.location_ids) query.location_ids = d.location_ids;
    log('Récupération de la liste...');
    const res = await utils.shopifyRequest(opts, "/inventory_levels.json", { query });
    if (!res.ok) return res;
    const items = (res.data && res.data.inventory_levels) || [];
    const first = items[0] || {};
    return { ok: true, inventory_item_id: String(first.inventory_item_id || ""), location_id: String(first.location_id || ""), available: first.available || 0 };
  }
};
