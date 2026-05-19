const { utils } = require("./utils");

module.exports = {
  async fd_groups_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération de la liste...');
    const res = await utils.freshdeskRequest(opts, "/groups");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = Array.isArray(res.data) ? res.data : [];
    const groups = results.map(r => ({ id: String(r.id || ""), name: r.name || "", description: r.description || "", createdAt: r.created_at || "" }));
    return { ok: true, totalCount: res.totalCount || 0, groups };
  }
};
