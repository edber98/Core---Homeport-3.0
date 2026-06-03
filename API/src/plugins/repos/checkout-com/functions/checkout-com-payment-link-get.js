const { utils } = require("./utils");

module.exports = {
  async checkout_com_payment_link_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const linkId = String(d.linkId || "").trim();
    if (!linkId) return { ok: false, error: "ID du lien requis." };

    const res = await utils.checkoutRequest(opts, `/payment-links/${encodeURIComponent(linkId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.compactPaymentLink(res.data || {}) };
  }
};
