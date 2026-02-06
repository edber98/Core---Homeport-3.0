const { utils } = require("./utils");

module.exports = {
  async dolibarr_invoice_add_line(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.id) return { ok: false, error: "Champ id requis." };
    if (!d.desc && d.desc !== 0) return { ok: false, error: "Champ desc requis." };
    if (!d.qty && d.qty !== 0) return { ok: false, error: "Champ qty requis." };
    if (!d.subprice && d.subprice !== 0) return { ok: false, error: "Champ subprice requis." };

    const body = {};
    if (d.desc !== undefined && d.desc !== null && d.desc !== "") body.desc = d.desc;
    if (d.qty !== undefined && d.qty !== null && d.qty !== "") body.qty = d.qty;
    if (d.subprice !== undefined && d.subprice !== null && d.subprice !== "") body.subprice = d.subprice;
    if (d.tva_tx !== undefined && d.tva_tx !== null && d.tva_tx !== "") body.tva_tx = d.tva_tx;
    if (d.fk_product !== undefined && d.fk_product !== null && d.fk_product !== "") body.fk_product = d.fk_product;
    if (d.remise_percent !== undefined && d.remise_percent !== null && d.remise_percent !== "") body.remise_percent = d.remise_percent;

    const res = await utils.dolibarrRequest(opts, `/invoices/${encodeURIComponent(d.id)}/lines`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...( typeof res.data === 'object' && res.data !== null ? res.data : { id: res.data }) };
  }
};
