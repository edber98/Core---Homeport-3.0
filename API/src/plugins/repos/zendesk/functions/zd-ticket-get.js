const { utils } = require("./utils");

module.exports = {
  async zd_ticket_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const ticketId = parseInt(d.ticketId, 10);
    if (isNaN(ticketId)) return { ok: false, error: "Missing ticketId." };

    log('Récupération des données...');
    const res = await utils.zendeskRequest(opts, `/tickets/${ticketId}.json`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.ticket) || {};
    return { ok: true, id: String(r.id || ""), subject: r.subject || "", description: r.description || "", status: r.status || "", priority: r.priority || "", assigneeId: String(r.assignee_id || ""), requesterId: String(r.requester_id || ""), createdAt: r.created_at || "" };
  }
};
