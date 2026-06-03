const { utils } = require("./utils");

module.exports = {
  async adyen_payment_link_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const linkId = String((inputs || {}).linkId || "").trim();
    if (!linkId) return { ok: false, error: "ID du lien requis." };

    log("Récupération du lien de paiement...");
    const res = await utils.adyenRequest(opts, `/paymentLinks/${encodeURIComponent(linkId)}`);
    if (!res.ok) return res;
    return utils.paymentLinkResult(res.data || {});
  }
};
