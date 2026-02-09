const { utils } = require("./utils");

module.exports = {
  async intercom_contact_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!(d.contactId || "").trim()) return { ok: false, error: "Missing contactId." };

    const res = await utils.intercomRequest(opts, `/contacts/${d.contactId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.id, type: r.type || r.role, name: r.name || "", email: r.email || "", phone: r.phone || "", role: r.role || "", createdAt: String(r.created_at || ""), updatedAt: String(r.updated_at || "") };
  }
};
