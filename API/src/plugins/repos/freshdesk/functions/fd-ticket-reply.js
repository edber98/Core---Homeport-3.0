const { utils } = require("./utils");

module.exports = {
  async fd_ticket_reply(node, msg, inputs, opts) {
    const d = inputs || {};
    const ticketId = parseInt(d.ticketId, 10);
    if (!Number.isFinite(ticketId) || ticketId <= 0) return { ok: false, error: "Missing or invalid ticketId." };
    if (!d.body) return { ok: false, error: "Missing body." };

    const body = { body: String(d.body) };
    if (d.ccEmails) body.cc_emails = String(d.ccEmails).split(",").map((s) => s.trim()).filter(Boolean);
    if (d.bccEmails) body.bcc_emails = String(d.bccEmails).split(",").map((s) => s.trim()).filter(Boolean);
    if (d.private !== undefined && d.private !== null && d.private !== "") {
      body.private = ["1", "true", "yes", "oui", "on"].includes(String(d.private).toLowerCase());
    }

    const res = await utils.freshdeskRequest(opts, `/tickets/${ticketId}/reply`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      id: String(r.id || ""),
      ticketId: String(r.ticket_id || ticketId),
      body: String(r.body_text || r.body || ""),
      private: String(Boolean(r.private))
    };
  }
};
