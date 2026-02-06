const { utils } = require("./utils");

module.exports = {
  async qb_item_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const name = (d.name || "").trim();
    if (!name) return { ok: false, error: "Missing name." };

    const body = { Name: name, Type: d.type || "Service" };
    if (d.description) body.Description = d.description;
    if (d.unitPrice !== undefined && d.unitPrice !== "") body.UnitPrice = parseFloat(d.unitPrice) || 0;
    if (d.incomeAccountRef) body.IncomeAccountRef = { value: d.incomeAccountRef };
    if (d.expenseAccountRef) body.ExpenseAccountRef = { value: d.expenseAccountRef };

    const res = await utils.qbRequest(opts, "/item", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.Item) || res.data || {};
    return { ok: true, id: String(r.Id || ""), name: r.Name || "", description: r.Description || "", unitPrice: String(r.UnitPrice != null ? r.UnitPrice : ""), type: r.Type || "", active: String(r.Active != null ? r.Active : ""), qtyOnHand: String(r.QtyOnHand != null ? r.QtyOnHand : "") };
  }
};
