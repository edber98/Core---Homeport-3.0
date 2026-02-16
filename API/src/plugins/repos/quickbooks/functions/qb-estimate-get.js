const { utils } = require("./utils");

module.exports = {
  async qb_estimate_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const estimateId = (d.estimateId || "").toString().trim();
    if (!estimateId) return { ok: false, error: "Missing estimateId." };

    log('Récupération des données...');
    const res = await utils.qbRequest(opts, `/estimate/${encodeURIComponent(estimateId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.Estimate) || res.data || {};
    return { ok: true, id: String(r.Id || ""), docNumber: r.DocNumber || "", txnDate: r.TxnDate || "", expirationDate: r.ExpirationDate || "", totalAmt: String(r.TotalAmt != null ? r.TotalAmt : ""), customerRef: (r.CustomerRef && String(r.CustomerRef.value)) || "", txnStatus: r.TxnStatus || "" };
  }
};
