const { utils } = require("./utils");

module.exports = {
  async stripe_price_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.priceId) return { ok: false, error: "Missing priceId." };
    const res = await utils.stripeRequest(opts, `/prices/${d.priceId}`);
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
