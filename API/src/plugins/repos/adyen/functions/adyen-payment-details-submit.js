const { utils } = require("./utils");

module.exports = {
  async adyen_payment_details_submit(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let details;
    let paymentData;
    try {
      details = utils.parseJson(d.details, "détails", undefined);
      paymentData = utils.parseJson(d.paymentData, "données de paiement", undefined);
    } catch (e) {
      return { ok: false, error: e.message };
    }
    if (!details) return { ok: false, error: "Détails de paiement requis." };

    const body = utils.compact({ details, paymentData });
    log("Soumission des détails de paiement...");
    const res = await utils.adyenRequest(opts, "/payments/details", { method: "POST", body });
    if (!res.ok) return res;
    return utils.paymentResult(res.data || {});
  }
};
