const { utils } = require("./utils");

module.exports = {
  async dbx_create_shared_link(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.path) return { ok: false, error: "Chemin du fichier requis." };

    const res = await utils.dbxRequest(opts, "/sharing/create_shared_link_with_settings", {
      path: d.path, settings: { requested_visibility: { ".tag": "public" } }
    });
    if (!res.ok) return res;
    return {
      ok: true, url: res.data.url || "", name: res.data.name || "",
      path: res.data.path_lower || "", visibility: res.data.link_permissions?.resolved_visibility?.[".tag"] || "",
      expires: res.data.expires || ""
    };
  }
};
