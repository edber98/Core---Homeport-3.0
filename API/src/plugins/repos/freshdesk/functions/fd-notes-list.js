const { utils } = require("./utils");

module.exports = {
  async fd_notes_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const ticketId = parseInt(d.ticketId, 10);
    if (isNaN(ticketId)) return { ok: false, error: "Missing ticketId." };

    log('Récupération de la liste...');
    const res = await utils.freshdeskRequest(opts, `/tickets/${ticketId}/conversations`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = Array.isArray(res.data) ? res.data : [];
    const notes = results.map(r => ({ id: String(r.id || ""), body: r.body_text || "", private: String(r.private || false), createdAt: r.created_at || "" }));
    return { ok: true, totalCount: res.totalCount || 0, notes };
  }
};
