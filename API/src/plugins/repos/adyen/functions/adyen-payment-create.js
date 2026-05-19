const { utils } = require("./utils");

module.exports = {
  async adyen_payment_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const base = utils.basePaymentBody(opts, d);
    if (!base.ok) return base;
    if (!d.reference) return { ok: false, error: "Référence requise." };

    let paymentMethod;
    let extraData;
    try {
      paymentMethod = utils.parseJson(d.paymentMethod, "moyen de paiement", undefined);
      extraData = utils.parseJson(d.extraData, "données additionnelles", undefined);
    } catch (e) {
      return { ok: false, error: e.message };
    }
    if (!paymentMethod) return { ok: false, error: "Moyen de paiement requis." };

    const body = utils.compact({
      ...base.body,
      reference: d.reference,
      paymentMethod,
      returnUrl: d.returnUrl,
      shopperReference: d.shopperReference,
      shopperEmail: d.shopperEmail,
      shopperIP: d.shopperIP,
      shopperInteraction: d.shopperInteraction,
      recurringProcessingModel: d.recurringProcessingModel,
      countryCode: d.countryCode,
      channel: d.channel
    });
    if (extraData) Object.assign(body, extraData);

    log("Démarrage du paiement...");
    const res = await utils.adyenRequest(opts, "/payments", {
      method: "POST",
      body,
      idempotencyKey: d.idempotencyKey
    });
    if (!res.ok) return res;
    return utils.paymentResult(res.data || {});
  }
};
