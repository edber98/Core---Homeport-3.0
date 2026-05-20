const { utils } = require("./utils");

module.exports = {
  async checkout_com_payment_void(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const paymentId = String(d.paymentId || "").trim();
    if (!paymentId) return { ok: false, error: "ID de paiement requis." };

    const body = {};
    utils.addIf(body, "reference", d.reference);
    if (d.metadata) {
      try { body.metadata = utils.parseJsonInput(d.metadata, "Métadonnées"); } catch (e) { return { ok: false, error: e.message }; }
    }

    log("Annulation du paiement...");
    const res = await utils.checkoutRequest(opts, `/payments/${encodeURIComponent(paymentId)}/voids`, { method: "POST", body, idempotencyKey: d.idempotencyKey });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, payment_id: paymentId, ...utils.compactAction(res.data || {}) };
  }
};
