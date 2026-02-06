const { utils } = require("./utils");

module.exports = {
  async fd_time_entry_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const ticketId = parseInt(d.ticketId, 10);
    if (isNaN(ticketId)) return { ok: false, error: "Missing ticketId." };
    if (!d.timeSpent) return { ok: false, error: "Missing timeSpent." };

    const body = { time_spent: d.timeSpent };
    if (d.note) body.note = d.note;

    const res = await utils.freshdeskRequest(opts, `/tickets/${ticketId}/time_entries`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "created", message: "Entrée de temps créée." };
  }
};
