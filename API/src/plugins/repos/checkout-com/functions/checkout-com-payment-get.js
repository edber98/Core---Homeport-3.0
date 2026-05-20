const { utils } = require("./utils");

module.exports = {
  async checkout_com_payment_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const paymentId = String(d.paymentId || "").trim();
    if (!paymentId) return { ok: false, error: "ID de paiement requis." };

    const res = await utils.checkoutRequest(opts, `/payments/${encodeURIComponent(paymentId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.compactPayment(res.data || {}) };
  }
};
