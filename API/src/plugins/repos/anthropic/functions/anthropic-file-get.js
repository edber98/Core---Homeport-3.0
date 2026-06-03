const { utils } = require("./utils");

module.exports = {
  async anthropic_file_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const fileId = String(d.fileId || "").trim();
    if (!fileId) return { ok: false, error: "ID du fichier requis." };

    log("Récupération du fichier...");
    const res = await utils.anthropicRequest(opts, `/files/${encodeURIComponent(fileId)}`, {
      beta: "files-api-2025-04-14"
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.mapFile(res.data) };
  }
};
