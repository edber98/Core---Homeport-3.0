const { utils } = require("./utils");

module.exports = {
  async qb_invoice_send_email(node, msg, inputs, opts) {
    const d = inputs || {};
    const invoiceId = (d.invoiceId || "").toString().trim();
    if (!invoiceId) return { ok: false, error: "Missing invoiceId." };

    const query = {};
    if (d.email) query.sendTo = d.email;

    const res = await utils.qbRequest(opts, `/invoice/${encodeURIComponent(invoiceId)}/send`, { method: "POST", query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "sent", message: `Facture ${invoiceId} envoyée par email.` };
  }
};
