const { utils } = require("./utils");

module.exports = {
  // Crée un ordre de fabrication (MO — Manufacturing Order) dans Dolibarr.
  // Module « Fabrication » (mrp) requis. Mappe l'entité ontologique
  // WorkItem/work_order de la famille `industry`.
  async dolibarr_mo_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.fk_product && d.fk_product !== 0) return { ok: false, error: "Champ fk_product requis (produit à fabriquer)." };

    const body = {};
    // Dolibarr exige une `ref` (l'API REST ne l'auto-génère pas comme l'UI).
    body.ref = (d.ref !== undefined && d.ref !== null && d.ref !== "") ? d.ref : ('MO-' + d.fk_product + '-' + Date.now().toString(36).slice(-5));
    body.fk_product = d.fk_product;
    body.status = (d.status !== undefined && d.status !== null && d.status !== "") ? d.status : 0;
    body.qty = (d.qty !== undefined && d.qty !== null && d.qty !== "") ? d.qty : 1;
    body.mrptype = (d.mrptype !== undefined && d.mrptype !== null && d.mrptype !== "") ? d.mrptype : 0; // 0 = fabrication
    if (d.fk_bom !== undefined && d.fk_bom !== null && d.fk_bom !== "") body.fk_bom = d.fk_bom;
    if (d.fk_warehouse !== undefined && d.fk_warehouse !== null && d.fk_warehouse !== "") body.fk_warehouse = d.fk_warehouse;
    if (d.fk_project !== undefined && d.fk_project !== null && d.fk_project !== "") body.fk_project = d.fk_project;
    if (d.date_start_planned !== undefined && d.date_start_planned !== null && d.date_start_planned !== "") body.date_start_planned = d.date_start_planned;
    if (d.note_public !== undefined && d.note_public !== null && d.note_public !== "") body.note_public = d.note_public;

    log('Création de l\'ordre de fabrication...');
    const res = await utils.dolibarrRequest(opts, "/mos", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...(typeof res.data === 'object' && res.data !== null ? res.data : { id: res.data }) };
  }
};
