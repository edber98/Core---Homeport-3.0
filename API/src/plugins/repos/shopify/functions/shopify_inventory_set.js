const { utils } = require("./utils");

module.exports = {
  async shopify_inventory_set(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.inventory_item_id) return { ok: false, error: "Missing inventory_item_id." };
    if (!d.location_id) return { ok: false, error: "Missing location_id." };
    if (d.available === undefined) return { ok: false, error: "Missing available." };
    const body = { inventory_item_id: Number(d.inventory_item_id), location_id: Number(d.location_id), available: Number(d.available) };
    log('Mise à jour en cours...');
    const res = await utils.shopifyRequest(opts, "/inventory_levels/set.json", { method: "POST", body });
    if (!res.ok) return res;
    return { ok: true, status: "set", message: "Inventaire défini à " + d.available + "." };
  }
};
