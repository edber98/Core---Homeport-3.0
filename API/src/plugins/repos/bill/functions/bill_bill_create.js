const { utils } = require("./utils");

module.exports = {
  async bill_bill_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.vendorId) return { ok: false, error: "ID du fournisseur requis." };
    if (!d.dueDate) return { ok: false, error: "Date d'échéance requise." };
    let lineItems;
    try { lineItems = utils.parseJson(d.billLineItemsJson, undefined, "Lignes"); } catch (e) { return { ok: false, error: e.message }; }
    const body = {
      vendorId: d.vendorId,
      dueDate: d.dueDate,
      billLineItems: Array.isArray(lineItems) && lineItems.length ? lineItems : [{ amount: Number(d.amount || 0), description: d.description || "" }]
    };
    if (d.invoiceNumber || d.invoiceDate) body.invoice = { invoiceNumber: d.invoiceNumber || "", invoiceDate: d.invoiceDate || d.dueDate };
    const res = await utils.billRequest(opts, "POST", "/v3/bills", { body });
    if (!res.ok) return res;
    const bill = res.data || {};
    return { ok: true, id: bill.id || "", vendorId: bill.vendorId || d.vendorId, amount: bill.amount || Number(d.amount || 0), dueDate: bill.dueDate || d.dueDate, paymentStatus: bill.paymentStatus || "" };
  }
};
