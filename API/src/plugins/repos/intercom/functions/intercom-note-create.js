const { utils } = require("./utils");

module.exports = {
  async intercom_note_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!(d.contactId || "").trim()) return { ok: false, error: "Missing contactId." };
    if (!(d.body || "").trim()) return { ok: false, error: "Missing body." };

    const body = { body: d.body };
    if (d.adminId) body.admin_id = d.adminId;
    log('Création en cours...');
    const res = await utils.intercomRequest(opts, `/contacts/${d.contactId}/notes`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.id, body: r.body || d.body, author: r.author?.name || "", createdAt: String(r.created_at || "") };
  }
};
