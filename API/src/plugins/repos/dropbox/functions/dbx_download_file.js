const path = require("path");
const { utils } = require("./utils");

const MIME_MAP = {
  ".pdf": "application/pdf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".png": "image/png", ".gif": "image/gif", ".svg": "image/svg+xml",
  ".txt": "text/plain", ".csv": "text/csv", ".json": "application/json",
  ".xml": "application/xml", ".html": "text/html", ".zip": "application/zip",
  ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint", ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".wav": "audio/wav",
  ".webp": "image/webp", ".bmp": "image/bmp", ".ico": "image/x-icon"
};

module.exports = {
  async dbx_download_file(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.path) return { ok: false, error: "Chemin du fichier requis." };

    log('Récupération des données...');
    const res = await utils.dbxRequest(opts, "/files/download", { path: d.path }, { isContent: true });
    if (!res.ok) return res;
    const entry = utils.mapEntry(res.data);
    entry.content = res.content || "";

    let file = null;
    if (opts.files && res.content) {
      const data = Buffer.from(res.content, "base64");
      const name = res.data.name || path.basename(d.path);
      const ext = path.extname(name).toLowerCase();
      const mimeType = (MIME_MAP[ext] || "application/octet-stream").split(";")[0].trim();
      file = await opts.files.store(data, {
        name: name,
        mimeType: mimeType,
        lifecycle: "execution"
      });
    }
    entry.file = file;

    return { ok: true, ...entry };
  }
};
