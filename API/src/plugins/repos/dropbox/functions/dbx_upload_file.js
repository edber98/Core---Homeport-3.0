const { utils } = require("./utils");

module.exports = {
  async dbx_upload_file(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.path) return { ok: false, error: "Chemin de destination requis." };

    const args = {
      path: d.path,
      mode: d.mode || "overwrite",
      autorename: true,
      mute: false
    };

    const res = await utils.dbxRequest(opts, "/files/upload", args, {
      isContent: true, upload: d.content || ""
    });
    if (!res.ok) return res;
    return { ok: true, ...utils.mapEntry(res.data) };
  }
};
