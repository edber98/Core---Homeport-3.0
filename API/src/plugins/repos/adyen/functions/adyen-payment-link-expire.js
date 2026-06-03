const { utils } = require("./utils");

module.exports = {
  async adyen_payment_link_expire(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const linkId = String(d.linkId || "").trim();
    if (!linkId) return { ok: false, error: "ID du lien requis." };

    log("Expiration du lien de paiement...");
    const res = await utils.adyenRequest(opts, `/paymentLinks/${encodeURIComponent(linkId)}`, {
      method: "PATCH",
      body: { status: "expired" },
      idempotencyKey: d.idempotencyKey
    });
    if (!res.ok) return res;
    return utils.paymentLinkResult(res.data || {});
  }
};
