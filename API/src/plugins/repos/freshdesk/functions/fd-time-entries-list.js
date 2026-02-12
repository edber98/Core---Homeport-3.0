const { utils } = require("./utils");

module.exports = {
  async fd_time_entries_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const ticketId = parseInt(d.ticketId, 10);
    if (isNaN(ticketId)) return { ok: false, error: "Missing ticketId." };

    const res = await utils.freshdeskRequest(opts, `/tickets/${ticketId}/time_entries`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, totalCount: res.totalCount || 0, status: "success", message: JSON.stringify(res.data) };
  }
};
