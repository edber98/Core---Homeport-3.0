const { utils } = require("./utils");

module.exports = {
  async dolibarr_stock_movement_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.product_id && d.product_id !== 0) return { ok: false, error: "Champ product_id requis." };
    if (!d.warehouse_id && d.warehouse_id !== 0) return { ok: false, error: "Champ warehouse_id requis." };
    if (!d.qty && d.qty !== 0) return { ok: false, error: "Champ qty requis." };

    const body = {};
    if (d.product_id !== undefined && d.product_id !== null && d.product_id !== "") body.product_id = d.product_id;
    if (d.warehouse_id !== undefined && d.warehouse_id !== null && d.warehouse_id !== "") body.warehouse_id = d.warehouse_id;
    if (d.qty !== undefined && d.qty !== null && d.qty !== "") body.qty = d.qty;
    if (d.type !== undefined && d.type !== null && d.type !== "") body.type = d.type;
    if (d.label !== undefined && d.label !== null && d.label !== "") body.label = d.label;
    if (d.inventorycode !== undefined && d.inventorycode !== null && d.inventorycode !== "") body.inventorycode = d.inventorycode;

    log('Création en cours...');
    const res = await utils.dolibarrRequest(opts, "/stockmovements", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...( typeof res.data === 'object' && res.data !== null ? res.data : { id: res.data }) };
  }
};
