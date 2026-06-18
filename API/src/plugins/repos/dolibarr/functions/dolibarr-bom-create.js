const { utils } = require("./utils");

module.exports = {
  // Crée une nomenclature (BOM — Bill Of Materials) dans Dolibarr.
  // Module « Nomenclatures » (mrp/bom) requis. Lignes ajoutées via l'API lines.
  async dolibarr_bom_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.fk_product && d.fk_product !== 0) return { ok: false, error: "Champ fk_product requis (produit à fabriquer)." };

    const body = {};
    // Dolibarr exige une `ref` (l'API REST ne l'auto-génère pas comme l'UI).
    body.ref = (d.ref !== undefined && d.ref !== null && d.ref !== "") ? d.ref : ('BOM-' + d.fk_product + '-' + Date.now().toString(36).slice(-5));
    body.label = (d.label !== undefined && d.label !== null && d.label !== "") ? d.label : ("BOM " + d.fk_product);
    body.fk_product = d.fk_product;
    body.status = (d.status !== undefined && d.status !== null && d.status !== "") ? d.status : 1;
    body.bomtype = (d.bomtype !== undefined && d.bomtype !== null && d.bomtype !== "") ? d.bomtype : 0; // 0 = fabrication
    body.qty = (d.qty !== undefined && d.qty !== null && d.qty !== "") ? d.qty : 1;
    if (d.description !== undefined && d.description !== null && d.description !== "") body.description = d.description;
    if (d.note_public !== undefined && d.note_public !== null && d.note_public !== "") body.note_public = d.note_public;

    log('Création de la nomenclature...');
    const res = await utils.dolibarrRequest(opts, "/boms", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...(typeof res.data === 'object' && res.data !== null ? res.data : { id: res.data }) };
  }
};
