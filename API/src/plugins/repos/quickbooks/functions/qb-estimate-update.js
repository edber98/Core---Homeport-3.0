const { utils } = require("./utils");

module.exports = {
  async qb_estimate_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const estimateId = (d.estimateId || "").toString().trim();
    if (!estimateId) return { ok: false, error: "Missing estimateId." };

    const getRes = await utils.qbRequest(opts, `/estimate/${encodeURIComponent(estimateId)}`);
    if (!getRes.ok) return { ok: false, error: getRes.error, status: getRes.status, details: getRes.details };

    const existing = (getRes.data && getRes.data.Estimate) || getRes.data || {};
    const body = { Id: estimateId, SyncToken: existing.SyncToken, sparse: true };
    if (d.customerRef) body.CustomerRef = { value: String(d.customerRef) };
    if (d.txnDate) body.TxnDate = d.txnDate;
    if (d.expirationDate) body.ExpirationDate = d.expirationDate;
    if (d.lineItems) {
      try { body.Line = JSON.parse(d.lineItems); } catch { return { ok: false, error: "Invalid lineItems JSON." }; }
    }

    const res = await utils.qbRequest(opts, "/estimate", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.Estimate) || res.data || {};
    return { ok: true, id: String(r.Id || ""), docNumber: r.DocNumber || "", txnDate: r.TxnDate || "", expirationDate: r.ExpirationDate || "", totalAmt: String(r.TotalAmt != null ? r.TotalAmt : ""), customerRef: (r.CustomerRef && String(r.CustomerRef.value)) || "", txnStatus: r.TxnStatus || "" };
  }
};
