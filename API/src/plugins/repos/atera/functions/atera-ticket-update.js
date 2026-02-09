const { utils } = require("./utils");

module.exports = {
  async atera_ticket_update(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.ticketId) return { ok: false, error: "Missing ticketId." };

    const body = {};
    if (d.TicketTitle) body.TicketTitle = d.TicketTitle;
    if (d.TicketStatus) body.TicketStatus = d.TicketStatus;
    if (d.TicketPriority) body.TicketPriority = d.TicketPriority;
    if (d.TicketImpact) body.TicketImpact = d.TicketImpact;
    if (d.TicketType) body.TicketType = d.TicketType;
    if (d.TechnicianContactID) body.TechnicianContactID = Number(d.TechnicianContactID);

    const res = await utils.ateraRequest(opts, `/tickets/${encodeURIComponent(d.ticketId)}`, { method: "PUT", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ActionID: res.data?.ActionID };
  }
};
