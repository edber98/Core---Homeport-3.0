const { utils } = require("./utils");

module.exports = {
  async box_file_update(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.fileId) return { ok: false, error: "ID du fichier requis." };
    const body = {};
    if (d.name) body.name = d.name;
    if (d.description) body.description = d.description;
    if (d.parentId) body.parent = { id: String(d.parentId) };
    const res = await utils.boxRequest(opts, "PUT", `/files/${encodeURIComponent(d.fileId)}`, { body });
    if (!res.ok) return res;
    return { ok: true, ...utils.mapItem(res.data || {}) };
  }
};
