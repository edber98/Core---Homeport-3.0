const { utils } = require("./utils");

module.exports = {
  async box_search(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.query) return { ok: false, error: "Recherche requise." };
    const res = await utils.boxRequest(opts, "GET", "/search", { query: { query: d.query, type: d.type, ancestor_folder_ids: d.folderIds, limit: d.limit || 25, offset: d.offset || 0 } });
    if (!res.ok) return res;
    const items = utils.entries(res.data).map(utils.mapItem);
    return { ok: true, totalCount: String((res.data && res.data.total_count) || items.length), items };
  }
};
