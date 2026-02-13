const { utils } = require("./utils");

module.exports = {
  async stripe_price_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.product) return { ok: false, error: "Missing product." };
    if (!d.unit_amount && d.unit_amount !== 0) return { ok: false, error: "Missing unit_amount." };
    if (!d.currency) return { ok: false, error: "Missing currency." };
    const body = {
      product: d.product,
      unit_amount: String(d.unit_amount),
      currency: d.currency
    };
    if (d.recurring_interval) {
      body["recurring[interval]"] = d.recurring_interval;
    }
    log('Création en cours...');
    const res = await utils.stripeRequest(opts, "/prices", { method: "POST", body });
    if (!res.ok) return res;
    const p = res.data;
    return {
      ok: true, id: p.id, product: p.product, unit_amount: p.unit_amount,
      currency: p.currency, type: p.type,
      recurring_interval: p.recurring && p.recurring.interval ? p.recurring.interval : null,
      active: p.active
    };
  }
};
