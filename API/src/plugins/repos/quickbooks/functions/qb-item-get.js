const { utils } = require("./utils");

module.exports = {
  async qb_item_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const itemId = (d.itemId || "").toString().trim();
    if (!itemId) return { ok: false, error: "Missing itemId." };

    log('Récupération des données...');
    const res = await utils.qbRequest(opts, `/item/${encodeURIComponent(itemId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.Item) || res.data || {};
    return { ok: true, id: String(r.Id || ""), name: r.Name || "", description: r.Description || "", unitPrice: String(r.UnitPrice != null ? r.UnitPrice : ""), type: r.Type || "", active: String(r.Active != null ? r.Active : ""), qtyOnHand: String(r.QtyOnHand != null ? r.QtyOnHand : "") };
  }
};
