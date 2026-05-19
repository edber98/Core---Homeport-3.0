const { utils } = require("./utils");

module.exports = {
  async anthropic_file_download(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const fileId = String(d.fileId || "").trim();
    const filename = String(d.filename || fileId || "anthropic-file").trim();
    if (!fileId) return { ok: false, error: "ID du fichier requis." };

    log("Téléchargement du fichier...");
    const res = await utils.anthropicRequest(opts, `/files/${encodeURIComponent(fileId)}/content`, {
      beta: "files-api-2025-04-14"
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const content = typeof res.data === "string" ? res.data : JSON.stringify(res.data || "");
    let file = null;
    if (opts && opts.files && typeof opts.files.store === "function") {
      file = await opts.files.store(Buffer.from(content), {
        name: filename,
        mimeType: res.headers?.get?.("content-type") || "application/octet-stream"
      });
    }
    return { ok: true, id: fileId, filename, content, file };
  }
};
