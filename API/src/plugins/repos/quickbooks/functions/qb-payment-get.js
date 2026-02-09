const { utils } = require("./utils");

module.exports = {
  async qb_payment_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const paymentId = (d.paymentId || "").toString().trim();
    if (!paymentId) return { ok: false, error: "Missing paymentId." };

    const res = await utils.qbRequest(opts, `/payment/${encodeURIComponent(paymentId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.Payment) || res.data || {};
    return { ok: true, id: String(r.Id || ""), txnDate: r.TxnDate || "", totalAmt: String(r.TotalAmt != null ? r.TotalAmt : ""), customerRef: (r.CustomerRef && String(r.CustomerRef.value)) || "", currencyRef: (r.CurrencyRef && r.CurrencyRef.value) || "", paymentMethodRef: (r.PaymentMethodRef && String(r.PaymentMethodRef.value)) || "" };
  }
};
