const { utils } = require("./utils");

module.exports = {
  async anthropic_file_upload(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const fileValue = d.file || d.content;
    const filename = String(d.filename || "document.txt").trim();
    const mimeType = String(d.mimeType || "text/plain").trim();
    if (!fileValue) return { ok: false, error: "Fichier requis." };

    let buffer;
    try {
      buffer = await utils.resolveFileBuffer(fileValue, opts);
    } catch (e) {
      return { ok: false, error: e.message };
    }
    if (!buffer) return { ok: false, error: "Fichier illisible." };

    const multipart = utils.multipartFileBody({
      fieldName: "file",
      filename,
      mimeType,
      buffer
    });

    log("Envoi du fichier...");
    const res = await utils.anthropicRequest(opts, "/files", {
      method: "POST",
      rawBody: multipart.body,
      beta: "files-api-2025-04-14",
      headers: { "Content-Type": `multipart/form-data; boundary=${multipart.boundary}` }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.mapFile(res.data) };
  }
};
