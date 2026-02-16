const { utils } = require("./utils");

module.exports = {
  async intercom_contact_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!(d.contactId || "").trim()) return { ok: false, error: "Missing contactId." };

    const body = {};
    if (d.email) body.email = d.email;
    if (d.name) body.name = d.name;
    if (d.phone) body.phone = d.phone;
    if (d.role) body.role = d.role;

    log('Mise à jour en cours...');
    const res = await utils.intercomRequest(opts, `/contacts/${d.contactId}`, { method: "PUT", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.id, type: r.type || r.role, name: r.name || "", email: r.email || "", phone: r.phone || "", role: r.role || "", createdAt: String(r.created_at || ""), updatedAt: String(r.updated_at || "") };
  }
};
