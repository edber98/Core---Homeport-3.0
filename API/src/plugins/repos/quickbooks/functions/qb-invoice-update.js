const { utils } = require("./utils");

module.exports = {
  async qb_invoice_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const invoiceId = (d.invoiceId || "").toString().trim();
    const syncToken = (d.syncToken || "").toString().trim();
    if (!invoiceId) return { ok: false, error: "Missing invoiceId." };
    if (!syncToken) return { ok: false, error: "Missing syncToken." };

    const body = { Id: invoiceId, SyncToken: syncToken, sparse: true };
    if (d.customerRef) body.CustomerRef = { value: d.customerRef };
    if (d.lineItems) {
      try { body.Line = JSON.parse(d.lineItems); } catch { return { ok: false, error: "Invalid lineItems JSON." }; }
    }

    const res = await utils.qbRequest(opts, "/invoice", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.Invoice) || res.data || {};
    return { ok: true, id: String(r.Id || ""), docNumber: r.DocNumber || "", txnDate: r.TxnDate || "", dueDate: r.DueDate || "", totalAmt: String(r.TotalAmt != null ? r.TotalAmt : ""), balance: String(r.Balance != null ? r.Balance : ""), currencyRef: (r.CurrencyRef && r.CurrencyRef.value) || "", customerRef: (r.CustomerRef && String(r.CustomerRef.value)) || "", emailStatus: r.EmailStatus || "" };
  }
};
