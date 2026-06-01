const { utils } = require('./utils');
module.exports = {
  async stripe_invoice_void(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.invoiceId) return { ok: false, error: 'Missing invoiceId.' };
    const res = await utils.stripeRequest(opts, `/invoices/${d.invoiceId}/void`, { method: 'POST', body: {} });
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  }
};
