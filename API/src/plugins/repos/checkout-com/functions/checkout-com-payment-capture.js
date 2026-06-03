const { utils } = require("./utils");

module.exports = {
  async checkout_com_payment_capture(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const paymentId = String(d.paymentId || "").trim();
    if (!paymentId) return { ok: false, error: "ID de paiement requis." };

    const body = {};
    if (d.amount !== undefined && d.amount !== "") body.amount = parseInt(d.amount, 10);
    utils.addIf(body, "capture_type", d.captureType);
    utils.addIf(body, "reference", d.reference);
    utils.addIf(body, "description", d.description);
    if (d.metadata) {
      try { body.metadata = utils.parseJsonInput(d.metadata, "Métadonnées"); } catch (e) { return { ok: false, error: e.message }; }
    }

    log("Capture du paiement...");
    const res = await utils.checkoutRequest(opts, `/payments/${encodeURIComponent(paymentId)}/captures`, { method: "POST", body, idempotencyKey: d.idempotencyKey });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, payment_id: paymentId, ...utils.compactAction(res.data || {}) };
  }
};
