const { utils } = require("./utils");

module.exports = {
  async shopify_inventory_adjust(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.inventory_item_id) return { ok: false, error: "Missing inventory_item_id." };
    if (!d.location_id) return { ok: false, error: "Missing location_id." };
    if (d.adjustment === undefined) return { ok: false, error: "Missing adjustment." };
    const body = { inventory_item_id: Number(d.inventory_item_id), location_id: Number(d.location_id), available_adjustment: Number(d.adjustment) };
    log('Appel API en cours...');
    const res = await utils.shopifyRequest(opts, "/inventory_levels/adjust.json", { method: "POST", body });
    if (!res.ok) return res;
    return { ok: true, status: "adjusted", message: "Inventaire ajusté de " + d.adjustment + "." };
  }
};
