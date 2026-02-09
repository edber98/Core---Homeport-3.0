const { utils } = require("./utils");

module.exports = {
  async fd_contact_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const contactId = parseInt(d.contactId, 10);
    if (isNaN(contactId)) return { ok: false, error: "Missing contactId." };

    const body = {};
    if (d.name) body.name = d.name;
    if (d.email) body.email = d.email;
    if (d.phone) body.phone = d.phone;

    const res = await utils.freshdeskRequest(opts, `/contacts/${contactId}`, { method: "PUT", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: String(r.id || ""), name: r.name || "", email: r.email || "", phone: r.phone || "", companyId: String(r.company_id || ""), createdAt: r.created_at || "" };
  }
};
