const { utils } = require("./utils");

module.exports = {
  async stripe_checkout_session_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.mode) return { ok: false, error: "Missing mode (payment or subscription)." };
    if (!d.success_url) return { ok: false, error: "Missing success_url." };
    if (!d.cancel_url) return { ok: false, error: "Missing cancel_url." };
    const body = {
      mode: d.mode,
      success_url: d.success_url,
      cancel_url: d.cancel_url
    };
    if (d.line_items_price) {
      body["line_items[0][price]"] = d.line_items_price;
      body["line_items[0][quantity]"] = String(d.line_items_quantity || 1);
    }
    if (d.customer) body.customer = d.customer;
    log('Création en cours...');
    const res = await utils.stripeRequest(opts, "/checkout/sessions", { method: "POST", body });
    if (!res.ok) return res;
    const s = res.data;
    return {
      ok: true, id: s.id, url: s.url, mode: s.mode, status: s.status,
      customer: s.customer, amount_total: s.amount_total, currency: s.currency
    };
  }
};
