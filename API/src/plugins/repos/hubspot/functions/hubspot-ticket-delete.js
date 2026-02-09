const { utils } = require("./utils");

module.exports = {
  async hubspot_ticket_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const ticketId = (d.ticketId || "").toString().trim();
    if (!ticketId) return { ok: false, error: "Missing ticketId." };

    const res = await utils.hubspotRequest(opts, `/crm/v3/objects/tickets/${encodeURIComponent(ticketId)}`, {
      method: "DELETE"
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "deleted", message: `Ticket ${ticketId} deleted.` };
  }
};
