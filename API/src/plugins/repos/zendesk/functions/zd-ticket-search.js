const { utils } = require("./utils");

module.exports = {
  async zd_ticket_search(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.query) return { ok: false, error: "Missing query." };

    log('Recherche en cours...');
    const res = await utils.zendeskRequest(opts, "/search.json", { query: { query: `type:ticket ${d.query}` } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.results) || [];
    const tickets = results.map(r => ({ id: String(r.id || ""), subject: r.subject || "", status: r.status || "", priority: r.priority || "", createdAt: r.created_at || "" }));
    return { ok: true, tickets , totalCount: tickets.length };
  }
};
