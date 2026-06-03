const { utils } = require("./utils");

module.exports = {
  async paypal_capture_get(node, msg, inputs, opts) {
    const captureId = String(inputs?.captureId || "").trim();
    if (!captureId) return { ok: false, error: "La capture est requise." };

    const res = await utils.paypalRequest(opts, `/v2/payments/captures/${encodeURIComponent(captureId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const d = res.data || {};
    const amount = d.amount || {};
    return {
      ok: true,
      id: d.id || "",
      status: d.status || "",
      message: d.status_details?.reason || "",
      amount: amount.value || "",
      currency: amount.currency_code || "",
      raw: d
    };
  }
};
