const { utils } = require("./utils");

module.exports = {
  async dolibarr_contact_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.id && d.id !== 0) return { ok: false, error: "Champ id requis." };
    const body = {};
    if (d.lastname !== undefined && d.lastname !== null && d.lastname !== "") body.lastname = d.lastname;
    if (d.firstname !== undefined && d.firstname !== null && d.firstname !== "") body.firstname = d.firstname;
    if (d.email !== undefined && d.email !== null && d.email !== "") body.email = d.email;
    if (d.phone_pro !== undefined && d.phone_pro !== null && d.phone_pro !== "") body.phone_pro = d.phone_pro;
    if (d.phone_mobile !== undefined && d.phone_mobile !== null && d.phone_mobile !== "") body.phone_mobile = d.phone_mobile;
    if (d.poste !== undefined && d.poste !== null && d.poste !== "") body.poste = d.poste;
    log('Traitement en cours...');
    const res = await utils.dolibarrRequest(opts, `/contacts/${encodeURIComponent(d.id)}`, { method: "PUT", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...(typeof res.data === "object" && res.data !== null ? res.data : { id: res.data }) };
  }
};
