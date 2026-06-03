const { utils } = require("./utils");

module.exports = {
  async box_folder_copy(node, msg, inputs, opts) {
    const d = inputs || {};
    const folderId = String(d.folderId || "").trim();
    const parentId = String(d.parentId || "").trim();
    if (!folderId) return { ok: false, error: "ID dossier requis." };
    if (!parentId) return { ok: false, error: "ID dossier destination requis." };

    const body = { parent: { id: parentId } };
    if (d.name) body.name = String(d.name);

    const res = await utils.boxRequest(opts, "POST", `/folders/${encodeURIComponent(folderId)}/copy`, { body });
    if (!res.ok) return res;
    return { ok: true, ...utils.mapItem(res.data || {}) };
  }
};
