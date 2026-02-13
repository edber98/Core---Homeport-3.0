const { utils } = require("./utils");

module.exports = {
  async qb_payment_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const customerRef = (d.customerRef || "").toString().trim();
    if (!customerRef) return { ok: false, error: "Missing customerRef." };
    if (!d.totalAmt) return { ok: false, error: "Missing totalAmt." };

    const body = { CustomerRef: { value: customerRef }, TotalAmt: parseFloat(d.totalAmt) };
    if (d.txnDate) body.TxnDate = d.txnDate;
    if (d.paymentMethodRef) body.PaymentMethodRef = { value: d.paymentMethodRef };

    log('Création en cours...');
    const res = await utils.qbRequest(opts, "/payment", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.Payment) || res.data || {};
    return { ok: true, id: String(r.Id || ""), txnDate: r.TxnDate || "", totalAmt: String(r.TotalAmt != null ? r.TotalAmt : ""), customerRef: (r.CustomerRef && String(r.CustomerRef.value)) || "", currencyRef: (r.CurrencyRef && r.CurrencyRef.value) || "", paymentMethodRef: (r.PaymentMethodRef && String(r.PaymentMethodRef.value)) || "" };
  }
};
