const { utils } = require("./utils");

module.exports = {
  async qb_items_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = d.query || "SELECT * FROM Item";
    const res = await utils.qbQuery(opts, query, d.maxResults);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.QueryResponse && res.data.QueryResponse.Item) || [];
    const items = results.map(r => ({ id: String(r.Id || ""), name: r.Name || "", unitPrice: String(r.UnitPrice != null ? r.UnitPrice : ""), type: r.Type || "", active: String(r.Active != null ? r.Active : "") }));
    return { ok: true, items };
  }
};
