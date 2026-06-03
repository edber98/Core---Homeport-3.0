const { utils } = require("./utils");

module.exports = {
  async adyen_payment_capture_cancel(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const paymentPspReference = String(d.paymentPspReference || "").trim();
    if (!paymentPspReference) return { ok: false, error: "PSP reference du paiement requise." };
    const merchantAccount = utils.merchantAccount(opts, d);
    if (!merchantAccount) return { ok: false, error: "Compte marchand Adyen requis." };

    const body = utils.compact({
      merchantAccount,
      reference: d.reference
    });

    log("Annulation de capture...");
    const res = await utils.adyenRequest(opts, `/payments/${encodeURIComponent(paymentPspReference)}/cancelOrRefund`, {
      method: "POST",
      body,
      idempotencyKey: d.idempotencyKey
    });
    if (!res.ok) return res;
    return utils.modificationResult(res.data || {});
  }
};
