const { utils } = require("./utils");

module.exports = {
  async dolibarr_contact_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.lastname && d.lastname !== 0) return { ok: false, error: "Champ lastname requis." };

    const body = {};
    if (d.lastname !== undefined && d.lastname !== null && d.lastname !== "") body.lastname = d.lastname;
    if (d.firstname !== undefined && d.firstname !== null && d.firstname !== "") body.firstname = d.firstname;
    if (d.email !== undefined && d.email !== null && d.email !== "") body.email = d.email;
    if (d.phone_pro !== undefined && d.phone_pro !== null && d.phone_pro !== "") body.phone_pro = d.phone_pro;
    if (d.phone_mobile !== undefined && d.phone_mobile !== null && d.phone_mobile !== "") body.phone_mobile = d.phone_mobile;
    if (d.socid !== undefined && d.socid !== null && d.socid !== "") body.socid = d.socid;
    if (d.poste !== undefined && d.poste !== null && d.poste !== "") body.poste = d.poste;
    if (d.address !== undefined && d.address !== null && d.address !== "") body.address = d.address;
    if (d.zip !== undefined && d.zip !== null && d.zip !== "") body.zip = d.zip;
    if (d.town !== undefined && d.town !== null && d.town !== "") body.town = d.town;
    if (d.civility_code !== undefined && d.civility_code !== null && d.civility_code !== "") body.civility_code = d.civility_code;
    if (d.note_public !== undefined && d.note_public !== null && d.note_public !== "") body.note_public = d.note_public;
    if (d.note_private !== undefined && d.note_private !== null && d.note_private !== "") body.note_private = d.note_private;

    log('Création en cours...');
    const res = await utils.dolibarrRequest(opts, "/contacts", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...( typeof res.data === 'object' && res.data !== null ? res.data : { id: res.data }) };
  }
};
