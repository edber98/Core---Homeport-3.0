const { utils } = require("./utils");
module.exports = {
  async dbx_download_zip(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.path) return { ok: false, error: "Chemin requis." };
    const res = await utils.dbxRequest(opts, "/files/download_zip", { path: d.path }, { isContent: true });
    if (!res.ok) return res;
    return { ok: true, name: d.path.split('/').pop() || 'archive.zip', path: d.path, file_base64: res.content || "", result_json: JSON.stringify(res.data || {}) };
  }
};
