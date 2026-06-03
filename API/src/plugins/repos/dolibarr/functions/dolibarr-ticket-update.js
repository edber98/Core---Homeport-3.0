const { utils } = require("./utils");

module.exports = {
  async dolibarr_ticket_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.id && d.id !== 0) return { ok: false, error: "Champ id requis." };
    const body = {};
    if (d.subject !== undefined && d.subject !== null && d.subject !== "") body.subject = d.subject;
    if (d.message !== undefined && d.message !== null && d.message !== "") body.message = d.message;
    if (d.status !== undefined && d.status !== null && d.status !== "") body.status = d.status;
    log('Traitement en cours...');
    const res = await utils.dolibarrRequest(opts, `/tickets/${encodeURIComponent(d.id)}`, { method: "PUT", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...(typeof res.data === "object" && res.data !== null ? res.data : { id: res.data }) };
  }
};
