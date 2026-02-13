const { utils } = require("./utils");

module.exports = {
  async stripe_invoice_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.invoiceId) return { ok: false, error: "Missing invoiceId." };
    log('Récupération des données...');
    const res = await utils.stripeRequest(opts, `/invoices/${d.invoiceId}`);
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  }
};
