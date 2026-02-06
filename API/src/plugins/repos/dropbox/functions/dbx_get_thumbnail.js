const { utils } = require("./utils");

module.exports = {
  async dbx_get_thumbnail(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.path) return { ok: false, error: "Chemin du fichier requis." };

    const res = await utils.dbxRequest(opts, "/files/get_thumbnail_v2", {
      resource: { ".tag": "path", path: d.path },
      size: { ".tag": d.size || "w128h128" },
      format: { ".tag": "jpeg" }
    }, { isContent: true });
    if (!res.ok) return res;
    const entry = utils.mapEntry(res.data.file_metadata || res.data);
    entry.content = res.content || "";
    return { ok: true, ...entry };
  }
};
