const { utils } = require("./utils");

module.exports = {
  async zd_comment_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const ticketId = parseInt(d.ticketId, 10);
    if (isNaN(ticketId)) return { ok: false, error: "Missing ticketId." };
    if (!d.body) return { ok: false, error: "Missing body." };

    const isPublic = d.public !== "false";
    const ticket = { comment: { body: d.body, public: isPublic } };

    log('Création en cours...');
    const res = await utils.zendeskRequest(opts, `/tickets/${ticketId}.json`, { method: "PUT", body: { ticket } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, id: "", body: d.body, authorId: "", public: String(isPublic), createdAt: new Date().toISOString() };
  }
};
