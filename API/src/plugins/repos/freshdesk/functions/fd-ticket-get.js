const { utils } = require("./utils");

module.exports = {
  async fd_ticket_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const ticketId = parseInt(d.ticketId, 10);
    if (isNaN(ticketId)) return { ok: false, error: "Missing ticketId." };

    const res = await utils.freshdeskRequest(opts, `/tickets/${ticketId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: String(r.id || ""), subject: r.subject || "", description: r.description_text || "", status: String(r.status || ""), priority: String(r.priority || ""), source: String(r.source || ""), requesterId: String(r.requester_id || ""), createdAt: r.created_at || "" };
  }
};
