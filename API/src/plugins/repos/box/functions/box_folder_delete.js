const { utils } = require("./utils");

module.exports = {
  async box_folder_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.folderId) return { ok: false, error: "ID du dossier requis." };
    const res = await utils.boxRequest(opts, "DELETE", `/folders/${encodeURIComponent(d.folderId)}`, { query: { recursive: d.recursive ? "true" : "" } });
    if (!res.ok) return res;
    return { ok: true, id: d.folderId, type: "folder", name: "", status: "deleted" };
  }
};
