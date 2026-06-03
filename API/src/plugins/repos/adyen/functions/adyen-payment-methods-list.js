const { utils } = require("./utils");

module.exports = {
  async adyen_payment_methods_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const merchantAccount = utils.merchantAccount(opts, d);
    if (!merchantAccount) return { ok: false, error: "Compte marchand Adyen requis." };

    let extraData;
    try {
      extraData = utils.parseJson(d.extraData, "données additionnelles", undefined);
    } catch (e) {
      return { ok: false, error: e.message };
    }

    const body = utils.compact({
      merchantAccount,
      countryCode: d.countryCode,
      shopperLocale: d.shopperLocale,
      shopperReference: d.shopperReference,
      channel: d.channel
    });
    const amount = utils.amountFromInputs(d);
    if (amount) body.amount = amount;
    if (extraData) Object.assign(body, extraData);

    log("Récupération des moyens de paiement...");
    const res = await utils.adyenRequest(opts, "/paymentMethods", { method: "POST", body });
    if (!res.ok) return res;
    const methods = Array.isArray(res.data?.paymentMethods) ? res.data.paymentMethods : [];
    return { ok: true, totalCount: methods.length, paymentMethods: methods, storedPaymentMethods: res.data?.storedPaymentMethods || [], raw: res.data };
  }
};
