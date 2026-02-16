const { utils } = require("./utils");

module.exports = {
  async fd_ticket_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.subject) return { ok: false, error: "Missing subject." };
    if (!d.description) return { ok: false, error: "Missing description." };
    if (!d.email) return { ok: false, error: "Missing email." };

    const body = { subject: d.subject, description: d.description, email: d.email };
    if (d.priority) body.priority = parseInt(d.priority, 10);
    if (d.status) body.status = parseInt(d.status, 10);
    if (d.tags) body.tags = d.tags.split(",").map(t => t.trim()).filter(Boolean);

    log('Création en cours...');
    const res = await utils.freshdeskRequest(opts, "/tickets", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: String(r.id || ""), subject: r.subject || "", description: r.description_text || "", status: String(r.status || ""), priority: String(r.priority || ""), source: String(r.source || ""), requesterId: String(r.requester_id || ""), createdAt: r.created_at || "" };
  }
};
