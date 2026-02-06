const { utils } = require("./utils");

module.exports = {
  async fd_note_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const ticketId = parseInt(d.ticketId, 10);
    if (isNaN(ticketId)) return { ok: false, error: "Missing ticketId." };
    if (!d.body) return { ok: false, error: "Missing body." };

    const isPrivate = d.private !== "false";
    const body = { body: d.body, private: isPrivate };

    const res = await utils.freshdeskRequest(opts, `/tickets/${ticketId}/notes`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: String(r.id || ""), body: r.body_text || d.body, private: String(r.private || isPrivate), createdAt: r.created_at || "" };
  }
};
