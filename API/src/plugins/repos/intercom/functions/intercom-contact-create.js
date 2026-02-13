const { utils } = require("./utils");

module.exports = {
  async intercom_contact_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!(d.email || "").trim()) return { ok: false, error: "Missing email." };

    const body = { role: d.role || "user", email: d.email };
    if (d.name) body.name = d.name;
    if (d.phone) body.phone = d.phone;
    if (d.externalId) body.external_id = d.externalId;

    log('Création en cours...');
    const res = await utils.intercomRequest(opts, "/contacts", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.id, type: r.type || r.role, name: r.name || "", email: r.email || "", phone: r.phone || "", role: r.role || "", createdAt: String(r.created_at || ""), updatedAt: String(r.updated_at || "") };
  }
};
