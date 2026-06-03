const { utils } = require("./utils");

module.exports = {
  async box_file_get(node, msg, inputs, opts) {
    const fileId = String((inputs && inputs.fileId) || "").trim();
    if (!fileId) return { ok: false, error: "ID du fichier requis." };
    const res = await utils.boxRequest(opts, "GET", `/files/${encodeURIComponent(fileId)}`, { query: { fields: "id,type,name,size,parent,created_at,modified_at,shared_link" } });
    if (!res.ok) return res;
    return { ok: true, ...utils.mapItem(res.data || {}) };
  }
};
