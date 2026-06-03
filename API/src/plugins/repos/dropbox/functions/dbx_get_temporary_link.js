const { utils } = require("./utils");
module.exports = {
  async dbx_get_temporary_link(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.path) return { ok: false, error: "Chemin requis." };
    const res = await utils.dbxRequest(opts, "/files/get_temporary_link", { path: d.path });
    if (!res.ok) return res;
    return { ok: true, url: res.data?.link || "", metadata: utils.mapEntry(res.data?.metadata || {}), result_json: JSON.stringify(res.data || {}) };
  }
};
