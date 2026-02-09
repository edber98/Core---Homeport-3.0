const { utils } = require("./utils");

module.exports = {
  async fd_ticket_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const ticketId = parseInt(d.ticketId, 10);
    if (isNaN(ticketId)) return { ok: false, error: "Missing ticketId." };

    const res = await utils.freshdeskRequest(opts, `/tickets/${ticketId}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "deleted", message: "Ticket supprimé." };
  }
};
