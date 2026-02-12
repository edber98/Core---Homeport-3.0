const { utils } = require("./utils");

module.exports = {
  async mc_tags_list(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.listId) return { ok: false, error: "Missing listId." };

    const res = await utils.mailchimpRequest(opts, `/lists/${d.listId}/tag-search`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.tags) || [];
    const tags = results.map(r => ({ id: String(r.id || ""), name: r.name || "" }));
    return { ok: true, tags, totalCount: res.data?.total_items || 0 };
  }
};
