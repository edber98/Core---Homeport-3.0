const { utils } = require("./utils");

module.exports = {
  async box_file_copy(node, msg, inputs, opts) {
    const d = inputs || {};
    const fileId = String(d.fileId || "").trim();
    const parentId = String(d.parentId || "").trim();
    if (!fileId) return { ok: false, error: "ID du fichier requis." };
    if (!parentId) return { ok: false, error: "ID du dossier destination requis." };

    const body = { parent: { id: parentId } };
    if (d.name) body.name = String(d.name);

    const res = await utils.boxRequest(opts, "POST", `/files/${encodeURIComponent(fileId)}/copy`, { body });
    if (!res.ok) return res;
    return { ok: true, ...utils.mapItem(res.data || {}) };
  }
};
