const { utils } = require("./utils");

module.exports = {
  async adyen_session_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const base = utils.basePaymentBody(opts, d);
    if (!base.ok) return base;
    if (!d.reference) return { ok: false, error: "Référence requise." };
    if (!d.returnUrl) return { ok: false, error: "URL de retour requise." };

    let extraData;
    try {
      extraData = utils.parseJson(d.extraData, "données additionnelles", undefined);
    } catch (e) {
      return { ok: false, error: e.message };
    }

    const body = utils.compact({
      ...base.body,
      reference: d.reference,
      returnUrl: d.returnUrl,
      countryCode: d.countryCode,
      shopperLocale: d.shopperLocale,
      shopperReference: d.shopperReference,
      shopperEmail: d.shopperEmail,
      channel: d.channel,
      expiresAt: d.expiresAt
    });
    if (extraData) Object.assign(body, extraData);

    log("Création de la session de paiement...");
    const res = await utils.adyenRequest(opts, "/sessions", {
      method: "POST",
      body,
      idempotencyKey: d.idempotencyKey
    });
    if (!res.ok) return res;
    return {
      ok: true,
      id: res.data?.id,
      sessionData: res.data?.sessionData,
      expiresAt: res.data?.expiresAt,
      amount: res.data?.amount || null,
      merchantAccount: res.data?.merchantAccount,
      reference: res.data?.reference,
      raw: res.data
    };
  }
};
