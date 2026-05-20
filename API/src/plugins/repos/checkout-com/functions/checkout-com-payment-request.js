const { utils } = require("./utils");

module.exports = {
  async checkout_com_payment_request(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const amount = d.amount === undefined || d.amount === "" ? undefined : parseInt(d.amount, 10);
    const currency = String(d.currency || "").trim().toUpperCase();
    if (!currency) return { ok: false, error: "Devise requise." };

    let source;
    try { source = utils.parseJsonInput(d.source, "Source"); } catch (e) { return { ok: false, error: e.message }; }
    if (!source) return { ok: false, error: "Source de paiement JSON requise." };

    const body = { source, currency };
    if (amount !== undefined) body.amount = amount;
    utils.addIf(body, "reference", d.reference);
    utils.addIf(body, "description", d.description);
    utils.addIf(body, "success_url", d.successUrl);
    utils.addIf(body, "failure_url", d.failureUrl);
    utils.addIf(body, "processing_channel_id", d.processingChannelId);
    body.capture = utils.parseBoolean(d.capture, true);
    if (d.customer) {
      try { body.customer = utils.parseJsonInput(d.customer, "Client"); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (d.metadata) {
      try { body.metadata = utils.parseJsonInput(d.metadata, "Métadonnées"); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (d.extra) {
      let extra;
      try { extra = utils.parseJsonInput(d.extra, "Options avancées"); } catch (e) { return { ok: false, error: e.message }; }
      Object.assign(body, extra || {});
    }

    log("Demande de paiement Checkout.com...");
    const res = await utils.checkoutRequest(opts, "/payments", { method: "POST", body, idempotencyKey: d.idempotencyKey });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.compactPayment(res.data || {}) };
  }
};
