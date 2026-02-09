const { utils } = require("./utils");

module.exports = {
  async shopify_collections_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.limit) query.limit = d.limit;
    if (d.since_id) query.since_id = d.since_id;
    const res = await utils.shopifyRequest(opts, "/custom_collections.json", { query });
    if (!res.ok) return res;
    const items = (res.data && res.data.custom_collections) || [];
    const collections = items.map(c => ({ id: String(c.id), title: c.title || "", handle: c.handle || "", published_at: c.published_at || "" }));
    return { ok: true, collections };
  }
};
