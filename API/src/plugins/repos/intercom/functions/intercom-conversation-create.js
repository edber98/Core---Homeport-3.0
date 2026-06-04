const { utils } = require("./utils");

module.exports = {
  async intercom_conversation_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!(d.from || "").trim()) return { ok: false, error: "Missing from." };
    if (!(d.messageText ?? d.noteBody || "").trim()) return { ok: false, error: "Missing body." };

    const body = { from: { type: "contact", id: d.from }, body: d.messageText ?? d.noteBody };
    log('Création en cours...');
    const res = await utils.intercomRequest(opts, "/conversations", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.id, type: r.type || "", title: r.title || "", state: r.state || "", priority: r.priority || "", adminAssigneeId: r.admin_assignee_id?.toString() || "", createdAt: String(r.created_at || ""), updatedAt: String(r.updated_at || "") };
  }
};
