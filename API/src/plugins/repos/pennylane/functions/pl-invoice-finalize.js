const { utils } = require("./utils");

module.exports = {
  async pl_invoice_finalize(node, msg, inputs, opts) {
    const d = inputs || {};
    const invoiceId = (d.invoiceId || "").toString().trim();
    if (!invoiceId) return { ok: false, error: "Missing invoiceId." };

    const res = await utils.plRequest(opts, `/customer_invoices/${encodeURIComponent(invoiceId)}/finalize`, { method: "PUT" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "finalized", message: `Facture ${invoiceId} finalisée.` };
  }
};
