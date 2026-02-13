const { utils } = require("./utils");

module.exports = {
  async dbx_list_shared_links(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const body = {};
    if (d.path) body.path = d.path;

    log('Récupération de la liste...');
    const res = await utils.dbxRequest(opts, "/sharing/list_shared_links", body);
    if (!res.ok) return res;
    const links = (res.data.links || []).map(l => ({
      url: l.url || "", name: l.name || "", path: l.path_lower || "",
      visibility: l.link_permissions?.resolved_visibility?.[".tag"] || ""
    }));
    return { ok: true, links };
  }
};
