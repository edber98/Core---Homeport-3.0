const { utils } = require("./utils");

module.exports = {
  async dolibarr_bankaccount_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.label && d.label !== 0) return { ok: false, error: "Champ label requis." };
    const body = {};
    if (d.label !== undefined && d.label !== null && d.label !== "") body.label = d.label;
    if (d.bank !== undefined && d.bank !== null && d.bank !== "") body.bank = d.bank;
    if (d.code_banque !== undefined && d.code_banque !== null && d.code_banque !== "") body.code_banque = d.code_banque;
    if (d.code_guichet !== undefined && d.code_guichet !== null && d.code_guichet !== "") body.code_guichet = d.code_guichet;
    if (d.number !== undefined && d.number !== null && d.number !== "") body.number = d.number;
    if (d.iban_prefix !== undefined && d.iban_prefix !== null && d.iban_prefix !== "") body.iban_prefix = d.iban_prefix;
    if (d.bic !== undefined && d.bic !== null && d.bic !== "") body.bic = d.bic;
    log('Traitement en cours...');
    const res = await utils.dolibarrRequest(opts, `/bankaccounts`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...(typeof res.data === "object" && res.data !== null ? res.data : { id: res.data }) };
  }
};
