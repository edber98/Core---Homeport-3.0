const { utils } = require("./utils");

module.exports = {
  async nc_file_upload(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.path) return { ok: false, error: "Chemin requis." };
    const content = d.content || "";
    const res = await utils.webdavRequest(opts, d.path, {
      method: "PUT",
      body: content,
      rawBody: true,
      headers: { "Content-Type": "application/octet-stream" }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "uploaded", message: `Fichier téléversé: ${d.path}` };
  }
};
