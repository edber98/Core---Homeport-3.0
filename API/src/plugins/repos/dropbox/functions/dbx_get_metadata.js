const { utils } = require("./utils");

module.exports = {
  async dbx_get_metadata(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.path) return { ok: false, error: "Chemin requis." };

    const res = await utils.dbxRequest(opts, "/files/get_metadata", {
      path: d.path, include_media_info: true
    });
    if (!res.ok) return res;
    return { ok: true, ...utils.mapEntry(res.data) };
  }
};
