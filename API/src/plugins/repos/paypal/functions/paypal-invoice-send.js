const { utils } = require("./utils");

module.exports = {
  async paypal_invoice_send(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const invoiceId = String(d.invoiceId || "").trim();
    if (!invoiceId) return { ok: false, error: "La facture est requise." };

    log("Envoi de la facture PayPal...");
    const res = await utils.paypalRequest(opts, `/v2/invoicing/invoices/${encodeURIComponent(invoiceId)}/send`, {
      method: "POST",
      body: { send_to_recipient: d.sendToRecipient !== false }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: invoiceId, status: "sent", message: "Facture envoyée." };
  }
};
