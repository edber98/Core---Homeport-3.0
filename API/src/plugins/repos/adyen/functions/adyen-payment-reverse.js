const { utils } = require("./utils");

module.exports = {
  async adyen_payment_reverse(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const paymentPspReference = String(d.paymentPspReference || "").trim();
    if (!paymentPspReference) return { ok: false, error: "PSP reference du paiement requise." };
    const merchantAccount = utils.merchantAccount(opts, d);
    if (!merchantAccount) return { ok: false, error: "Compte marchand Adyen requis." };

    const body = utils.compact({ merchantAccount, reference: d.reference });
    log("Reversal du paiement...");
    const res = await utils.adyenRequest(opts, `/payments/${encodeURIComponent(paymentPspReference)}/reversals`, {
      method: "POST",
      body,
      idempotencyKey: d.idempotencyKey
    });
    if (!res.ok) return res;
    return utils.modificationResult(res.data || {});
  }
};
