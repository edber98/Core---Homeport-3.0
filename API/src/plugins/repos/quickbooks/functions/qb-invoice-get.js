const { utils } = require("./utils");

module.exports = {
  async qb_invoice_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const invoiceId = (d.invoiceId || "").toString().trim();
    if (!invoiceId) return { ok: false, error: "Missing invoiceId." };

    log('Récupération des données...');
    const res = await utils.qbRequest(opts, `/invoice/${encodeURIComponent(invoiceId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.Invoice) || res.data || {};
    return { ok: true, id: String(r.Id || ""), docNumber: r.DocNumber || "", txnDate: r.TxnDate || "", dueDate: r.DueDate || "", totalAmt: String(r.TotalAmt != null ? r.TotalAmt : ""), balance: String(r.Balance != null ? r.Balance : ""), currencyRef: (r.CurrencyRef && r.CurrencyRef.value) || "", customerRef: (r.CustomerRef && String(r.CustomerRef.value)) || "", emailStatus: r.EmailStatus || "" };
  }
};
