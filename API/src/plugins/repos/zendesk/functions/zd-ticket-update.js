const { utils } = require("./utils");

module.exports = {
  async zd_ticket_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const ticketId = parseInt(d.ticketId, 10);
    if (isNaN(ticketId)) return { ok: false, error: "Missing ticketId." };

    const ticket = {};
    if (d.subject) ticket.subject = d.subject;
    if (d.status) ticket.status = d.status;
    if (d.priority) ticket.priority = d.priority;
    if (d.assigneeId) ticket.assignee_id = parseInt(d.assigneeId, 10);
    if (d.comment) ticket.comment = { body: d.comment, public: true };

    const res = await utils.zendeskRequest(opts, `/tickets/${ticketId}.json`, { method: "PUT", body: { ticket } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.ticket) || {};
    return { ok: true, id: String(r.id || ""), subject: r.subject || "", description: r.description || "", status: r.status || "", priority: r.priority || "", assigneeId: String(r.assignee_id || ""), requesterId: String(r.requester_id || ""), createdAt: r.created_at || "" };
  }
};
