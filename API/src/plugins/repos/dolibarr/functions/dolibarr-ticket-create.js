const { utils } = require("./utils");

module.exports = {
  async dolibarr_ticket_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.subject && d.subject !== 0) return { ok: false, error: "Champ subject requis." };
    if (!d.message && d.message !== 0) return { ok: false, error: "Champ message requis." };

    const body = {};
    if (d.subject !== undefined && d.subject !== null && d.subject !== "") body.subject = d.subject;
    if (d.message !== undefined && d.message !== null && d.message !== "") body.message = d.message;
    if (d.fk_soc !== undefined && d.fk_soc !== null && d.fk_soc !== "") body.fk_soc = d.fk_soc;
    if (d.fk_project !== undefined && d.fk_project !== null && d.fk_project !== "") body.fk_project = d.fk_project;
    if (d.type_code !== undefined && d.type_code !== null && d.type_code !== "") body.type_code = d.type_code;
    if (d.category_code !== undefined && d.category_code !== null && d.category_code !== "") body.category_code = d.category_code;
    if (d.severity_code !== undefined && d.severity_code !== null && d.severity_code !== "") body.severity_code = d.severity_code;

    log('Création en cours...');
    const res = await utils.dolibarrRequest(opts, "/tickets", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...( typeof res.data === 'object' && res.data !== null ? res.data : { id: res.data }) };
  }
};
