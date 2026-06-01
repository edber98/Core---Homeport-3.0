const { utils } = require("./utils");

module.exports = {
  async bill_bill_delete(node, msg, inputs, opts) {
    const billId = String((inputs && inputs.billId) || "").trim();
    if (!billId) return { ok: false, error: "ID facture requis." };

    const res = await utils.billRequest(opts, "DELETE", `/v3/bills/${encodeURIComponent(billId)}`);
    if (!res.ok) return res;
    return { ok: true, id: billId, status: "deleted" };
  }
};
