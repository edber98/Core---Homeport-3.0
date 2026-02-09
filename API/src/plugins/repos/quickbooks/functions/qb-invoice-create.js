const { utils } = require("./utils");

module.exports = {
  async qb_invoice_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const customerRef = (d.customerRef || "").toString().trim();
    if (!customerRef) return { ok: false, error: "Missing customerRef." };

    const body = { CustomerRef: { value: customerRef } };
    if (d.txnDate) body.TxnDate = d.txnDate;
    if (d.dueDate) body.DueDate = d.dueDate;
    if (d.lineItems) {
      try { body.Line = JSON.parse(d.lineItems); } catch { return { ok: false, error: "Invalid lineItems JSON." }; }
    }

    const res = await utils.qbRequest(opts, "/invoice", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.Invoice) || res.data || {};
    return { ok: true, id: String(r.Id || ""), docNumber: r.DocNumber || "", txnDate: r.TxnDate || "", dueDate: r.DueDate || "", totalAmt: String(r.TotalAmt != null ? r.TotalAmt : ""), balance: String(r.Balance != null ? r.Balance : ""), currencyRef: (r.CurrencyRef && r.CurrencyRef.value) || "", customerRef: (r.CustomerRef && String(r.CustomerRef.value)) || "", emailStatus: r.EmailStatus || "" };
  }
};
