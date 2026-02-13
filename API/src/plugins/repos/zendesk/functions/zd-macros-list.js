const { utils } = require("./utils");

module.exports = {
  async zd_macros_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération de la liste...');
    const res = await utils.zendeskRequest(opts, "/macros.json");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.macros) || [];
    const macros = results.map(r => ({ id: String(r.id || ""), title: r.title || "", active: String(r.active || false), description: r.description || "" }));
    return { ok: true, totalCount: res.data?.count || 0, macros };
  }
};
