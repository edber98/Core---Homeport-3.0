const { utils } = require("./utils");

module.exports = {
  async paypal_invoice_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const invoiceId = String(d.invoiceId || "").trim();
    if (!invoiceId) return { ok: false, error: "La facture est requise." };

    const res = await utils.paypalRequest(opts, `/v2/invoicing/invoices/${encodeURIComponent(invoiceId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return utils.mapInvoice(res.data || {});
  }
};
