const { utils } = require("./utils");

module.exports = {
  async zd_user_search(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.query) return { ok: false, error: "Missing query." };

    log('Recherche en cours...');
    const res = await utils.zendeskRequest(opts, "/search.json", { query: { query: `type:user ${d.query}` } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.results) || [];
    const users = results.map(r => ({ id: String(r.id || ""), name: r.name || "", email: r.email || "", role: r.role || "", createdAt: r.created_at || "" }));
    return { ok: true, users , totalCount: users.length };
  }
};
