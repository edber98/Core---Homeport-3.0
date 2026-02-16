const { utils } = require("./utils");

module.exports = {
  async zd_ticket_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.subject) return { ok: false, error: "Missing subject." };
    if (!d.description) return { ok: false, error: "Missing description." };

    const ticket = { subject: d.subject, comment: { body: d.description } };
    if (d.priority) ticket.priority = d.priority;
    if (d.requesterId) ticket.requester_id = parseInt(d.requesterId, 10);
    if (d.assigneeId) ticket.assignee_id = parseInt(d.assigneeId, 10);
    if (d.tags) ticket.tags = d.tags.split(",").map(t => t.trim()).filter(Boolean);

    log('Création en cours...');
    const res = await utils.zendeskRequest(opts, "/tickets.json", { method: "POST", body: { ticket } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.ticket) || {};
    return { ok: true, id: String(r.id || ""), subject: r.subject || "", description: r.description || "", status: r.status || "", priority: r.priority || "", assigneeId: String(r.assignee_id || ""), requesterId: String(r.requester_id || ""), createdAt: r.created_at || "" };
  }
};
