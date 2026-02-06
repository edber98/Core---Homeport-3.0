const { utils } = require("./utils");

module.exports = {
  async fd_tickets_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.page) query.page = parseInt(d.page, 10);
    if (d.perPage) query.per_page = parseInt(d.perPage, 10);

    const res = await utils.freshdeskRequest(opts, "/tickets", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = res.data || [];
    const tickets = results.map(r => ({ id: String(r.id || ""), subject: r.subject || "", status: String(r.status || ""), priority: String(r.priority || ""), createdAt: r.created_at || "" }));
    return { ok: true, tickets };
  }
};
