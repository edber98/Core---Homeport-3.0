const { utils } = require("./utils");

module.exports = {
  async dolibarr_thirdparty_update(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.id) return { ok: false, error: "Champ id requis." };

    const body = {};
    if (d.name !== undefined && d.name !== null && d.name !== "") body.name = d.name;
    if (d.email !== undefined && d.email !== null && d.email !== "") body.email = d.email;
    if (d.phone !== undefined && d.phone !== null && d.phone !== "") body.phone = d.phone;
    if (d.address !== undefined && d.address !== null && d.address !== "") body.address = d.address;
    if (d.zip !== undefined && d.zip !== null && d.zip !== "") body.zip = d.zip;
    if (d.town !== undefined && d.town !== null && d.town !== "") body.town = d.town;
    if (d.country_code !== undefined && d.country_code !== null && d.country_code !== "") body.country_code = d.country_code;
    if (d.url !== undefined && d.url !== null && d.url !== "") body.url = d.url;
    if (d.tva_intra !== undefined && d.tva_intra !== null && d.tva_intra !== "") body.tva_intra = d.tva_intra;
    if (d.note_public !== undefined && d.note_public !== null && d.note_public !== "") body.note_public = d.note_public;
    if (d.note_private !== undefined && d.note_private !== null && d.note_private !== "") body.note_private = d.note_private;

    const res = await utils.dolibarrRequest(opts, `/thirdparties/${encodeURIComponent(d.id)}`, { method: "PUT", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...( typeof res.data === 'object' && res.data !== null ? res.data : { id: res.data }) };
  }
};
