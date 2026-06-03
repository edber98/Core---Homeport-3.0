const { utils } = require("./utils");

module.exports = {
  async bill_payment_get(node, msg, inputs, opts) {
    const paymentId = String((inputs && inputs.paymentId) || "").trim();
    if (!paymentId) return { ok: false, error: "ID paiement requis." };

    const res = await utils.billRequest(opts, "GET", `/v3/payments/${encodeURIComponent(paymentId)}`);
    if (!res.ok) return res;
    const p = res.data || {};
    return {
      ok: true,
      id: p.id || paymentId,
      vendorId: p.vendorId || "",
      billId: p.billId || "",
      amount: Number(p.amount || 0),
      processDate: p.processDate || "",
      status: p.status || p.paymentStatus || ""
    };
  }
};
