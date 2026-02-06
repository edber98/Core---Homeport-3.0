const { utils } = require("./utils");

module.exports = {
  async shopify_collection_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.collectionId) return { ok: false, error: "Missing collectionId." };
    const res = await utils.shopifyRequest(opts, `/collections/${d.collectionId}.json`);
    if (!res.ok) return res;
    const c = res.data.collection || {};
    return { ok: true, id: String(c.id), title: c.title || "", handle: c.handle || "", published_at: c.published_at || "" };
  }
};
