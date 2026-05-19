const { utils } = require("./utils");

module.exports = {
  async adyen_payment_link_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const base = utils.basePaymentBody(opts, d);
    if (!base.ok) return base;

    let extraData;
    let allowedPaymentMethods;
    try {
      extraData = utils.parseJson(d.extraData, "données additionnelles", undefined);
      allowedPaymentMethods = utils.parseJson(d.allowedPaymentMethods, "moyens de paiement", undefined);
    } catch (e) {
      return { ok: false, error: e.message };
    }

    const body = utils.compact({
      ...base.body,
      reference: d.reference,
      description: d.description,
      countryCode: d.countryCode,
      shopperLocale: d.shopperLocale,
      shopperReference: d.shopperReference,
      shopperEmail: d.shopperEmail,
      returnUrl: d.returnUrl,
      expiresAt: d.expiresAt
    });
    if (utils.boolValue(d.reusable) !== undefined) body.reusable = utils.boolValue(d.reusable);
    if (allowedPaymentMethods) body.allowedPaymentMethods = allowedPaymentMethods;
    if (extraData) Object.assign(body, extraData);

    log("Création du lien de paiement...");
    const res = await utils.adyenRequest(opts, "/paymentLinks", {
      method: "POST",
      body,
      idempotencyKey: d.idempotencyKey
    });
    if (!res.ok) return res;
    return utils.paymentLinkResult(res.data || {});
  }
};
