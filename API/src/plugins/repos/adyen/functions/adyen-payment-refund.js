const { utils } = require("./utils");

module.exports = {
  async adyen_payment_refund(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const paymentPspReference = String(d.paymentPspReference || "").trim();
    if (!paymentPspReference) return { ok: false, error: "PSP reference du paiement requise." };
    const base = utils.basePaymentBody(opts, d);
    if (!base.ok) return base;

    const body = utils.compact({
      ...base.body,
      reference: d.reference
    });

    log("Remboursement du paiement...");
    const res = await utils.adyenRequest(opts, `/payments/${encodeURIComponent(paymentPspReference)}/refunds`, {
      method: "POST",
      body,
      idempotencyKey: d.idempotencyKey
    });
    if (!res.ok) return res;
    return utils.modificationResult(res.data || {});
  }
};
