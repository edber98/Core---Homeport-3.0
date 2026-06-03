const { utils } = require("./utils");

module.exports = {
  async box_file_version_upload(node, msg, inputs, opts) {
    const d = inputs || {};
    const fileId = String(d.fileId || "").trim();
    if (!fileId) return { ok: false, error: "ID fichier requis." };

    const source = d.file || d.content;
    if (!source) return { ok: false, error: "Fichier ou contenu requis." };
    const buffer = await utils.resolveFile(source, opts);
    if (!buffer) return { ok: false, error: "Impossible de lire le fichier." };

    const form = new FormData();
    form.append("file", new Blob([buffer], { type: d.mimeType || "application/octet-stream" }), d.name || `file-${fileId}`);
    if (d.name) form.append("attributes", JSON.stringify({ name: String(d.name) }));

    const res = await utils.boxRequest(opts, "POST", `/files/${encodeURIComponent(fileId)}/content`, { upload: true, body: form });
    if (!res.ok) return res;
    const entry = (res.data && Array.isArray(res.data.entries) && res.data.entries[0]) || {};
    return { ok: true, ...utils.mapItem(entry) };
  }
};
