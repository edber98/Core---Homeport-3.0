const { utils } = require("./utils");

module.exports = {
  async qb_item_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const itemId = (d.itemId || "").toString().trim();
    const syncToken = (d.syncToken || "").toString().trim();
    if (!itemId) return { ok: false, error: "Missing itemId." };
    if (!syncToken) return { ok: false, error: "Missing syncToken." };

    const body = { Id: itemId, SyncToken: syncToken, sparse: true };
    if (d.name) body.Name = d.name;
    if (d.description) body.Description = d.description;
    if (d.unitPrice !== undefined && d.unitPrice !== "") body.UnitPrice = parseFloat(d.unitPrice) || 0;

    const res = await utils.qbRequest(opts, "/item", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.Item) || res.data || {};
    return { ok: true, id: String(r.Id || ""), name: r.Name || "", description: r.Description || "", unitPrice: String(r.UnitPrice != null ? r.UnitPrice : ""), type: r.Type || "", active: String(r.Active != null ? r.Active : ""), qtyOnHand: String(r.QtyOnHand != null ? r.QtyOnHand : "") };
  }
};
