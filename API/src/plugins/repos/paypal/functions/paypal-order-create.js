const { utils } = require("./utils");

module.exports = {
  async paypal_order_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const body = {
      intent: String(d.intent || "CAPTURE"),
      purchase_units: [
        {
          reference_id: d.referenceId || undefined,
          amount: {
            currency_code: String(d.currency || "EUR"),
            value: String(d.amount || "10.00")
          }
        }
      ],
      application_context: {
        return_url: d.returnUrl || undefined,
        cancel_url: d.cancelUrl || undefined
      }
    };

    log("Création de la commande PayPal...");
    const res = await utils.paypalRequest(opts, "/v2/checkout/orders", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return utils.mapOrder(res.data || {});
  }
};
