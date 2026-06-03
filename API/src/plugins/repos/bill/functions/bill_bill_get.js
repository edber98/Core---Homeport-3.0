const { utils } = require("./utils");

module.exports = {
  async bill_bill_get(node, msg, inputs, opts) {
    const id = String((inputs && (inputs.billId || inputs.id)) || "").trim();
    if (!id) return { ok: false, error: "ID de la facture fournisseur requis." };
    const res = await utils.billRequest(opts, "GET", `/v3/bills/${encodeURIComponent(id)}`);
    if (!res.ok) return res;
    const bill = res.data || {};
    return { ok: true, id: bill.id || id, vendorId: bill.vendorId || "", amount: bill.amount || 0, dueDate: bill.dueDate || "", invoiceNumber: (bill.invoice && bill.invoice.invoiceNumber) || bill.invoiceNumber || "", paymentStatus: bill.paymentStatus || "" };
  }
};
