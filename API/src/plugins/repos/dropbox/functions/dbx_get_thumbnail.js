const path = require("path");
const { utils } = require("./utils");

module.exports = {
  async dbx_get_thumbnail(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.path) return { ok: false, error: "Chemin du fichier requis." };

    log('Récupération des données...');
    const res = await utils.dbxRequest(opts, "/files/get_thumbnail_v2", {
      resource: { ".tag": "path", path: d.path },
      size: { ".tag": d.size || "w128h128" },
      format: { ".tag": "jpeg" }
    }, { isContent: true });
    if (!res.ok) return res;
    const entry = utils.mapEntry(res.data.file_metadata || res.data);
    entry.content = res.content || "";

    let file = null;
    if (opts.files && res.content) {
      const data = Buffer.from(res.content, "base64");
      const baseName = path.basename(d.path, path.extname(d.path));
      const name = baseName + "_thumb.jpg";
      file = await opts.files.store(data, {
        name: name,
        mimeType: "image/jpeg",
        lifecycle: "execution"
      });
    }
    entry.file = file;

    return { ok: true, ...entry };
  }
};
