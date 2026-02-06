const { utils } = require("./utils");

module.exports = {
  async fd_ticket_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const ticketId = parseInt(d.ticketId, 10);
    if (isNaN(ticketId)) return { ok: false, error: "Missing ticketId." };

    const body = {};
    if (d.subject) body.subject = d.subject;
    if (d.priority) body.priority = parseInt(d.priority, 10);
    if (d.status) body.status = parseInt(d.status, 10);
    if (d.assigneeId) body.responder_id = parseInt(d.assigneeId, 10);

    const res = await utils.freshdeskRequest(opts, `/tickets/${ticketId}`, { method: "PUT", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: String(r.id || ""), subject: r.subject || "", description: r.description_text || "", status: String(r.status || ""), priority: String(r.priority || ""), source: String(r.source || ""), requesterId: String(r.requester_id || ""), createdAt: r.created_at || "" };
  }
};
