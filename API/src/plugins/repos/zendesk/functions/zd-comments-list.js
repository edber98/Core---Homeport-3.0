const { utils } = require("./utils");

module.exports = {
  async zd_comments_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const ticketId = parseInt(d.ticketId, 10);
    if (isNaN(ticketId)) return { ok: false, error: "Missing ticketId." };

    const res = await utils.zendeskRequest(opts, `/tickets/${ticketId}/comments.json`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.comments) || [];
    const comments = results.map(r => ({ id: String(r.id || ""), body: r.body || "", authorId: String(r.author_id || ""), public: String(r.public || false), createdAt: r.created_at || "" }));
    return { ok: true, comments };
  }
};
