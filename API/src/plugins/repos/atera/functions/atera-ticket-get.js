const { utils } = require("./utils");

module.exports = {
  async atera_ticket_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.ticketId) return { ok: false, error: "Missing ticketId." };

    const res = await utils.ateraRequest(opts, `/tickets/${encodeURIComponent(d.ticketId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...res.data };
  }
};
