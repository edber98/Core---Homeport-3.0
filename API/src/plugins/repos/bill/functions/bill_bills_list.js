const { utils } = require("./utils");

module.exports = {
  async bill_bills_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const res = await utils.billRequest(opts, "GET", "/v3/bills", { query: { max: d.pageSize || d.max, start: d.start, vendorId: d.vendorId, paymentStatus: d.paymentStatus } });
    if (!res.ok) return res;
    const bills = utils.items(res.data, "bills").map((bill) => ({
      id: bill.id || "",
      vendorId: bill.vendorId || "",
      amount: bill.amount || 0,
      dueDate: bill.dueDate || "",
      invoiceNumber: (bill.invoice && bill.invoice.invoiceNumber) || bill.invoiceNumber || "",
      paymentStatus: bill.paymentStatus || ""
    }));
    return { ok: true, totalCount: String(bills.length), bills };
  }
};
