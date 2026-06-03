const { utils } = require("./utils");

module.exports = {
  async box_folder_get(node, msg, inputs, opts) {
    const folderId = String((inputs && inputs.folderId) || "0");
    const res = await utils.boxRequest(opts, "GET", `/folders/${encodeURIComponent(folderId)}`, { query: { fields: "id,type,name,size,parent,created_at,modified_at,shared_link" } });
    if (!res.ok) return res;
    return { ok: true, ...utils.mapItem(res.data || {}) };
  }
};
