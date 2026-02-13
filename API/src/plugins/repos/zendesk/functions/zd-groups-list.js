const { utils } = require("./utils");

module.exports = {
  async zd_groups_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération de la liste...');
    const res = await utils.zendeskRequest(opts, "/groups.json");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.groups) || [];
    const groups = results.map(r => ({ id: String(r.id || ""), name: r.name || "", description: r.description || "", createdAt: r.created_at || "" }));
    return { ok: true, totalCount: res.data?.count || 0, groups };
  }
};
