const { utils } = require("./utils");

module.exports = {
  async qb_estimate_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const customerRef = (d.customerRef || "").toString().trim();
    if (!customerRef) return { ok: false, error: "Missing customerRef." };

    const body = { CustomerRef: { value: customerRef } };
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
