const { utils } = require("./utils");

module.exports = {
  async dolibarr_get_thirdparties_by_id_generatebankaccountdocument_by_companybankid_by_model(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.id && d.id !== 0) return { ok: false, error: "Champ id requis." };
    if (!d.companybankid && d.companybankid !== 0) return { ok: false, error: "Champ companybankid requis." };
    if (!d.model && d.model !== 0) return { ok: false, error: "Champ model requis." };
    const query = d.query || "";
    const path = `/thirdparties/${encodeURIComponent(d.id)}/generateBankAccountDocument/${encodeURIComponent(d.companybankid)}/${encodeURIComponent(d.model)}` + (query ? ("?" + query) : "");
    log('Requête API Dolibarr...');
    const res = await utils.dolibarrRequest(opts, path, { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, data: res.data, totalRecords: res.totalRecords };
  }
};
