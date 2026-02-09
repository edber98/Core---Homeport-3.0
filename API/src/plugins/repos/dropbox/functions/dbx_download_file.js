const { utils } = require("./utils");

module.exports = {
  async dbx_download_file(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.path) return { ok: false, error: "Chemin du fichier requis." };

    const res = await utils.dbxRequest(opts, "/files/download", { path: d.path }, { isContent: true });
    if (!res.ok) return res;
    const entry = utils.mapEntry(res.data);
    entry.content = res.content || "";
    return { ok: true, ...entry };
  }
};
