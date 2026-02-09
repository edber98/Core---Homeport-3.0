const { utils } = require("./utils");

module.exports = {
  async dolibarr_order_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.socid && d.socid !== 0) return { ok: false, error: "Champ socid requis." };

    const body = {};
    if (d.socid !== undefined && d.socid !== null && d.socid !== "") body.socid = d.socid;
    if (d.date !== undefined && d.date !== null && d.date !== "") body.date = d.date;
    if (d.date_livraison !== undefined && d.date_livraison !== null && d.date_livraison !== "") body.date_livraison = d.date_livraison;
    if (d.fk_project !== undefined && d.fk_project !== null && d.fk_project !== "") body.fk_project = d.fk_project;
    if (d.cond_reglement_id !== undefined && d.cond_reglement_id !== null && d.cond_reglement_id !== "") body.cond_reglement_id = d.cond_reglement_id;
    if (d.mode_reglement_id !== undefined && d.mode_reglement_id !== null && d.mode_reglement_id !== "") body.mode_reglement_id = d.mode_reglement_id;
    if (d.note_public !== undefined && d.note_public !== null && d.note_public !== "") body.note_public = d.note_public;
    if (d.note_private !== undefined && d.note_private !== null && d.note_private !== "") body.note_private = d.note_private;

    const res = await utils.dolibarrRequest(opts, "/orders", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...( typeof res.data === 'object' && res.data !== null ? res.data : { id: res.data }) };
  }
};
