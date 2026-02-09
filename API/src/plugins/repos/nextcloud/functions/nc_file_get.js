const { utils } = require("./utils");

module.exports = {
  async nc_file_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.path) return { ok: false, error: "Chemin requis." };
    const res = await utils.webdavRequest(opts, d.path, { method: "GET", rawResponse: true });
    if (!res.ok) return { ok: false, error: res.error, status: res.status };
    return { ok: true, name: d.path.split("/").pop(), path: d.path, contentType: res.contentType || "", size: "", lastModified: "", etag: "" };
  }
};
