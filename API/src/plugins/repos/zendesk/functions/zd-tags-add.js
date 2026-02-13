const { utils } = require("./utils");

module.exports = {
  async zd_tags_add(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const ticketId = parseInt(d.ticketId, 10);
    if (isNaN(ticketId)) return { ok: false, error: "Missing ticketId." };
    if (!d.tags) return { ok: false, error: "Missing tags." };

    const tags = d.tags.split(",").map(t => t.trim()).filter(Boolean);
    log('Création en cours...');
    const res = await utils.zendeskRequest(opts, `/tickets/${ticketId}/tags.json`, { method: "PUT", body: { tags } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "added", message: `Tags ajoutés: ${tags.join(", ")}` };
  }
};
