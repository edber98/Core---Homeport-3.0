const { utils } = require("./utils");

module.exports = {
  async bill_payment_cancel(node, msg, inputs, opts) {
    const paymentId = String((inputs && inputs.paymentId) || "").trim();
    if (!paymentId) return { ok: false, error: "ID paiement requis." };

    const res = await utils.billRequest(opts, "POST", `/v3/payments/${encodeURIComponent(paymentId)}/cancel`);
    if (!res.ok) return res;
    return { ok: true, id: paymentId, status: "cancelled", details: res.data || {} };
  }
};
