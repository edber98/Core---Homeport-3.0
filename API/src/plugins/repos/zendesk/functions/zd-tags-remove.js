const { utils } = require("./utils");

module.exports = {
  async zd_tags_remove(node, msg, inputs, opts) {
    const d = inputs || {};
    const ticketId = parseInt(d.ticketId, 10);
    if (isNaN(ticketId)) return { ok: false, error: "Missing ticketId." };
    if (!d.tags) return { ok: false, error: "Missing tags." };

    const tags = d.tags.split(",").map(t => t.trim()).filter(Boolean);
    const res = await utils.zendeskRequest(opts, `/tickets/${ticketId}/tags.json`, { method: "DELETE", body: { tags } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "removed", message: `Tags retirés: ${tags.join(", ")}` };
  }
};
