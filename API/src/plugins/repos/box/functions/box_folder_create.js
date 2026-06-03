const { utils } = require("./utils");

module.exports = {
  async box_folder_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.name) return { ok: false, error: "Nom du dossier requis." };
    const res = await utils.boxRequest(opts, "POST", "/folders", { body: { name: d.name, parent: { id: String(d.parentId || "0") } } });
    if (!res.ok) return res;
    return { ok: true, ...utils.mapItem(res.data || {}) };
  }
};
