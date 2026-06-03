const { utils } = require("./utils");

module.exports = {
  async checkout_com_payment_actions_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const paymentId = String(d.paymentId || "").trim();
    if (!paymentId) return { ok: false, error: "ID de paiement requis." };

    const res = await utils.checkoutRequest(opts, `/payments/${encodeURIComponent(paymentId)}/actions`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const actions = (Array.isArray(res.data) ? res.data : []).map(utils.compactAction);
    return { ok: true, actions, totalCount: actions.length };
  }
};
