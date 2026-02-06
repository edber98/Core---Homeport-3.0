const { utils } = require("./utils");

module.exports = {
  async stripe_invoice_pay(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.invoiceId) return { ok: false, error: "Missing invoiceId." };
    const res = await utils.stripeRequest(opts, `/invoices/${d.invoiceId}/pay`, { method: "POST", body: {} });
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  }
};
