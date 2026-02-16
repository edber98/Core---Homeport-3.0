const { utils } = require("./utils");

module.exports = {
  async atera_ticket_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.ticketId) return { ok: false, error: "Missing ticketId." };

    log('Suppression en cours...');
    const res = await utils.ateraRequest(opts, `/tickets/${encodeURIComponent(d.ticketId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true };
  }
};
