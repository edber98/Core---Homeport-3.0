const { utils } = require("./utils");

module.exports = {
  async box_folder_items_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const folderId = String(d.folderId || "0");
    const res = await utils.boxRequest(opts, "GET", `/folders/${encodeURIComponent(folderId)}/items`, {
      query: { limit: d.limit || 100, offset: d.offset || 0, fields: d.fields || "id,type,name,size,parent,created_at,modified_at,shared_link" }
    });
    if (!res.ok) return res;
    const items = utils.entries(res.data).map(utils.mapItem);
    return { ok: true, totalCount: String((res.data && res.data.total_count) || items.length), items };
  }
};
