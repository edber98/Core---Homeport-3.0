const { utils } = require("./utils");

module.exports = {
  async stripe_invoices_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {};
    if (d.limit) query.limit = d.limit;
    if (d.starting_after) query.starting_after = d.starting_after;
    if (d.customer) query.customer = d.customer;
    if (d.status) query.status = d.status;
    log('Récupération de la liste...');
    const res = await utils.stripeRequest(opts, "/invoices", { query });
    if (!res.ok) return res;
    const items = (res.data && res.data.data) || [];
    const invoices = items.map(inv => ({
      id: inv.id, customer: inv.customer, status: inv.status,
      amount_due: inv.amount_due, amount_paid: inv.amount_paid,
      currency: inv.currency, created: inv.created,
      hosted_invoice_url: inv.hosted_invoice_url
    }));
    const hasMore = !!(res.data && res.data.has_more);
    return { ok: true, invoices, hasMore , totalCount: invoices.length };
  }
};
