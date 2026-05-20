const { utils } = require("./utils");

module.exports = {
  async box_file_upload(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.name) return { ok: false, error: "Nom du fichier requis." };
    const buffer = await utils.resolveFile(d.file || d.content, opts);
    if (!buffer) return { ok: false, error: "Contenu du fichier requis." };
    const form = new FormData();
    form.append("attributes", JSON.stringify({ name: d.name, parent: { id: String(d.parentId || "0") } }));
    form.append("file", new Blob([buffer], { type: d.mimeType || "application/octet-stream" }), d.name);
    const res = await utils.boxRequest(opts, "POST", "/files/content", { upload: true, body: form });
    if (!res.ok) return res;
    const file = utils.entries(res.data)[0] || res.data || {};
    return { ok: true, ...utils.mapItem(file) };
  }
};
