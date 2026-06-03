const { utils } = require("./utils");

module.exports = {
  async paypal_capture_refund(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const captureId = String(d.captureId || "").trim();
    if (!captureId) return { ok: false, error: "La capture est requise." };

    const body = {};
    if (d.amount) {
      body.amount = {
        value: String(d.amount),
        currency_code: String(d.currency || "EUR")
      };
    }
    if (d.note) body.note_to_payer = String(d.note);

    log("Création du remboursement PayPal...");
    const res = await utils.paypalRequest(opts, `/v2/payments/captures/${encodeURIComponent(captureId)}/refund`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const data = res.data || {};
    return {
      ok: true,
      id: data.id || "",
      status: data.status || "",
      amount: data.amount?.value || "",
      currency: data.amount?.currency_code || ""
    };
  }
};
