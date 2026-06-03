const { utils } = require("./utils");

module.exports = {
  async dolibarr_bankaccount_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.id && d.id !== 0) return { ok: false, error: "Champ id requis." };
    const body = {};
    if (d.label !== undefined && d.label !== null && d.label !== "") body.label = d.label;
    if (d.bank !== undefined && d.bank !== null && d.bank !== "") body.bank = d.bank;
    if (d.number !== undefined && d.number !== null && d.number !== "") body.number = d.number;
    if (d.iban_prefix !== undefined && d.iban_prefix !== null && d.iban_prefix !== "") body.iban_prefix = d.iban_prefix;
    if (d.bic !== undefined && d.bic !== null && d.bic !== "") body.bic = d.bic;
    log('Traitement en cours...');
    const res = await utils.dolibarrRequest(opts, `/bankaccounts/${encodeURIComponent(d.id)}`, { method: "PUT", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...(typeof res.data === "object" && res.data !== null ? res.data : { id: res.data }) };
  }
};
