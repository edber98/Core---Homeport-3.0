const { utils } = require("./utils");

module.exports = {
  async dolibarr_proposal_validate(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.id && d.id !== 0) return { ok: false, error: "Champ id requis." };
    const body = {};
    // Aucun champ body optionnel.
    log('Traitement en cours...');
    const res = await utils.dolibarrRequest(opts, `/proposals/${encodeURIComponent(d.id)}/validate`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...(typeof res.data === "object" && res.data !== null ? res.data : { id: res.data }) };
  }
};
