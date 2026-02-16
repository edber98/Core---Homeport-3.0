const { utils } = require("./utils");

module.exports = {
  async atera_ticket_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.ticketId) return { ok: false, error: "Missing ticketId." };

    log('Récupération des données...');
    const res = await utils.ateraRequest(opts, `/tickets/${encodeURIComponent(d.ticketId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...res.data };
  }
};
