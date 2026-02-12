const { utils } = require("./utils");

module.exports = {
  async zd_tickets_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.page) query.page = parseInt(d.page, 10);
    if (d.perPage) query.per_page = parseInt(d.perPage, 10);

    const res = await utils.zendeskRequest(opts, "/tickets.json", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.tickets) || [];
    const tickets = results.map(r => ({ id: String(r.id || ""), subject: r.subject || "", status: r.status || "", priority: r.priority || "", createdAt: r.created_at || "" }));
    return { ok: true, totalCount: res.data?.count || 0, tickets };
  }
};
