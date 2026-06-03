const { utils } = require("./utils");

module.exports = {
  async paypal_invoice_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const recipientEmail = String(d.recipientEmail || "").trim();
    if (!recipientEmail) return { ok: false, error: "L'email client est requis." };

    const currency = String(d.currency || "EUR");
    const items = utils.parseJson(d.items, []);
    const body = {
      detail: {
        currency_code: currency,
        note: d.note || undefined
      },
      invoicer: {},
      primary_recipients: [
        {
          billing_info: {
            email_address: recipientEmail
          }
        }
      ],
      items
    };

    log("Création de la facture PayPal...");
    const res = await utils.paypalRequest(opts, "/v2/invoicing/invoices", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return utils.mapInvoice(res.data || {});
  }
};
