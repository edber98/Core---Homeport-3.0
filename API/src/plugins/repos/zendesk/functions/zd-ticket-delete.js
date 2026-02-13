const { utils } = require("./utils");

module.exports = {
  async zd_ticket_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const ticketId = parseInt(d.ticketId, 10);
    if (isNaN(ticketId)) return { ok: false, error: "Missing ticketId." };

    log('Suppression en cours...');
    const res = await utils.zendeskRequest(opts, `/tickets/${ticketId}.json`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "deleted", message: "Ticket supprimé." };
  }
};
