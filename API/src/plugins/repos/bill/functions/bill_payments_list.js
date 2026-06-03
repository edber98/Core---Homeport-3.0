const { utils } = require("./utils");

module.exports = {
  async bill_payments_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const res = await utils.billRequest(opts, "GET", "/v3/payments", { query: { max: d.pageSize || d.max, start: d.start, vendorId: d.vendorId, billId: d.billId } });
    if (!res.ok) return res;
    const payments = utils.items(res.data, "payments").map((payment) => ({
      id: payment.id || "",
      vendorId: payment.vendorId || "",
      billId: payment.billId || "",
      amount: payment.amount || 0,
      processDate: payment.processDate || "",
      status: payment.status || ""
    }));
    return { ok: true, totalCount: String(payments.length), payments };
  }
};
