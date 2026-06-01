const { utils } = require("./utils");

module.exports = {
  async dolibarr_category_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.id && d.id !== 0) return { ok: false, error: "Champ id requis." };
    const body = {};
    if (d.label !== undefined && d.label !== null && d.label !== "") body.label = d.label;
    if (d.description !== undefined && d.description !== null && d.description !== "") body.description = d.description;
    if (d.color !== undefined && d.color !== null && d.color !== "") body.color = d.color;
    log('Traitement en cours...');
    const res = await utils.dolibarrRequest(opts, `/categories/${encodeURIComponent(d.id)}`, { method: "PUT", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...(typeof res.data === "object" && res.data !== null ? res.data : { id: res.data }) };
  }
};
