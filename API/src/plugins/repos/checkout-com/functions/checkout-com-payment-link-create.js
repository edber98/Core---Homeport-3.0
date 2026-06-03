const { utils } = require("./utils");

module.exports = {
  async checkout_com_payment_link_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const amount = parseInt(d.amount, 10);
    const currency = String(d.currency || "").trim().toUpperCase();
    const country = String(d.country || "").trim().toUpperCase();
    if (!amount) return { ok: false, error: "Montant requis." };
    if (!currency) return { ok: false, error: "Devise requise." };
    if (!country) return { ok: false, error: "Pays de facturation requis." };

    const body = { amount, currency, billing: { address: { country } } };
    utils.addIf(body, "reference", d.reference);
    utils.addIf(body, "description", d.description);
    utils.addIf(body, "return_url", d.returnUrl);
    utils.addIf(body, "expires_on", d.expiresOn);
    if (d.customerEmail) body.customer = { email: String(d.customerEmail).trim() };
    if (d.locale) body.locale = d.locale;
    if (d.metadata) {
      try { body.metadata = utils.parseJsonInput(d.metadata, "Métadonnées"); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (d.products) {
      try { body.products = utils.parseJsonInput(d.products, "Produits"); } catch (e) { return { ok: false, error: e.message }; }
    }

    log("Création du lien de paiement...");
    const res = await utils.checkoutRequest(opts, "/payment-links", { method: "POST", body, idempotencyKey: d.idempotencyKey });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.compactPaymentLink(res.data || {}) };
  }
};
