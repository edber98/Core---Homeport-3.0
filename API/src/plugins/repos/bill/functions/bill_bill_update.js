const { utils } = require("./utils");

module.exports = {
  async bill_bill_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const id = String(d.billId || d.id || "").trim();
    if (!id) return { ok: false, error: "ID de la facture fournisseur requis." };
    let lineItems;
    try { lineItems = utils.parseJson(d.billLineItemsJson, undefined, "Lignes"); } catch (e) { return { ok: false, error: e.message }; }
    const body = {};
    if (d.dueDate) body.dueDate = d.dueDate;
    if (d.description) body.description = d.description;
    if (Array.isArray(lineItems)) body.billLineItems = lineItems;
    const res = await utils.billRequest(opts, "PATCH", `/v3/bills/${encodeURIComponent(id)}`, { body });
    if (!res.ok) return res;
    const bill = res.data || {};
    return { ok: true, id: bill.id || id, vendorId: bill.vendorId || "", amount: bill.amount || 0, dueDate: bill.dueDate || d.dueDate || "", paymentStatus: bill.paymentStatus || "" };
  }
};
