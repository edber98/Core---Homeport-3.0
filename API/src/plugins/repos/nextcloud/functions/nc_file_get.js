const { utils } = require("./utils");

module.exports = {
  async nc_file_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.path) return { ok: false, error: "Chemin requis." };
    log('Récupération des données...');
    const res = await utils.webdavRequest(opts, d.path, { method: "GET", rawResponse: true });
    if (!res.ok) return { ok: false, error: res.error, status: res.status };

    const name = d.path.split("/").pop() || "file";
    const mimeType = res.contentType || "application/octet-stream";

    // Store downloaded file via opts.files if available
    let file = null;
    if (opts.files && res.data) {
      file = await opts.files.store(res.data, {
        name,
        mimeType: mimeType.split(";")[0].trim(),
        lifecycle: "execution"
      });
    }

    return {
      ok: true,
      name,
      path: d.path,
      contentType: mimeType,
      size: res.data ? Buffer.from(res.data, "base64").length : 0,
      lastModified: "",
      etag: "",
      file
    };
  }
};
