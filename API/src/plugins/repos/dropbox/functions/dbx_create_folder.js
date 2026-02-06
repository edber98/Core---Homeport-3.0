const { utils } = require("./utils");

module.exports = {
  async dbx_create_folder(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.path) return { ok: false, error: "Chemin du dossier requis." };

    const res = await utils.dbxRequest(opts, "/files/create_folder_v2", {
      path: d.path, autorename: false
    });
    if (!res.ok) return res;
    const meta = res.data.metadata || res.data;
    return { ok: true, id: meta.id || "", name: meta.name || "", path: meta.path_display || "" };
  }
};
