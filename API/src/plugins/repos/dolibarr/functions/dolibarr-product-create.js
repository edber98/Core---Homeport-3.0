const { utils } = require("./utils");

module.exports = {
  async dolibarr_product_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.ref && d.ref !== 0) return { ok: false, error: "Champ ref requis." };
    if (!d.label && d.label !== 0) return { ok: false, error: "Champ label requis." };

    const body = {};
    if (d.ref !== undefined && d.ref !== null && d.ref !== "") body.ref = d.ref;
    if (d.label !== undefined && d.label !== null && d.label !== "") body.label = d.label;
    if (d.type !== undefined && d.type !== null && d.type !== "") body.type = d.type;
    if (d.description !== undefined && d.description !== null && d.description !== "") body.description = d.description;
    if (d.price !== undefined && d.price !== null && d.price !== "") body.price = d.price;
    if (d.tva_tx !== undefined && d.tva_tx !== null && d.tva_tx !== "") body.tva_tx = d.tva_tx;
    if (d.barcode !== undefined && d.barcode !== null && d.barcode !== "") body.barcode = d.barcode;
    if (d.weight !== undefined && d.weight !== null && d.weight !== "") body.weight = d.weight;
    if (d.status !== undefined && d.status !== null && d.status !== "") body.status = d.status;
    if (d.status_buy !== undefined && d.status_buy !== null && d.status_buy !== "") body.status_buy = d.status_buy;
    if (d.note_public !== undefined && d.note_public !== null && d.note_public !== "") body.note_public = d.note_public;
    if (d.note_private !== undefined && d.note_private !== null && d.note_private !== "") body.note_private = d.note_private;

    log('Création en cours...');
    const res = await utils.dolibarrRequest(opts, "/products", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...( typeof res.data === 'object' && res.data !== null ? res.data : { id: res.data }) };
  }
};
