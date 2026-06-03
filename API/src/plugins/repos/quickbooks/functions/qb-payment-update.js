const { utils } = require("./utils");

module.exports = {
  async qb_payment_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const paymentId = (d.paymentId || "").toString().trim();
    if (!paymentId) return { ok: false, error: "Missing paymentId." };

    const getRes = await utils.qbRequest(opts, `/payment/${encodeURIComponent(paymentId)}`);
    if (!getRes.ok) return { ok: false, error: getRes.error, status: getRes.status, details: getRes.details };

    const existing = (getRes.data && getRes.data.Payment) || getRes.data || {};
    const body = { Id: paymentId, SyncToken: existing.SyncToken, sparse: true };
    if (d.customerRef) body.CustomerRef = { value: String(d.customerRef) };
    if (d.totalAmt !== undefined && d.totalAmt !== null && d.totalAmt !== "") body.TotalAmt = parseFloat(d.totalAmt);
    if (d.txnDate) body.TxnDate = d.txnDate;
    if (d.paymentMethodRef) body.PaymentMethodRef = { value: String(d.paymentMethodRef) };

    const res = await utils.qbRequest(opts, "/payment", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.Payment) || res.data || {};
    return { ok: true, id: String(r.Id || ""), txnDate: r.TxnDate || "", totalAmt: String(r.TotalAmt != null ? r.TotalAmt : ""), customerRef: (r.CustomerRef && String(r.CustomerRef.value)) || "", currencyRef: (r.CurrencyRef && r.CurrencyRef.value) || "", paymentMethodRef: (r.PaymentMethodRef && String(r.PaymentMethodRef.value)) || "" };
  }
};
