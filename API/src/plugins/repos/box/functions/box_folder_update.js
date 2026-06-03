const { utils } = require("./utils");

module.exports = {
  async box_folder_update(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.folderId) return { ok: false, error: "ID du dossier requis." };
    const body = {};
    if (d.name) body.name = d.name;
    if (d.description) body.description = d.description;
    if (d.parentId) body.parent = { id: String(d.parentId) };
    const res = await utils.boxRequest(opts, "PUT", `/folders/${encodeURIComponent(d.folderId)}`, { body });
    if (!res.ok) return res;
    return { ok: true, ...utils.mapItem(res.data || {}) };
  }
};
