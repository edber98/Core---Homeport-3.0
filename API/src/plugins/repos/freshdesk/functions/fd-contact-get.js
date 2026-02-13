const { utils } = require("./utils");

module.exports = {
  async fd_contact_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const contactId = parseInt(d.contactId, 10);
    if (isNaN(contactId)) return { ok: false, error: "Missing contactId." };

    log('Récupération des données...');
    const res = await utils.freshdeskRequest(opts, `/contacts/${contactId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: String(r.id || ""), name: r.name || "", email: r.email || "", phone: r.phone || "", companyId: String(r.company_id || ""), createdAt: r.created_at || "" };
  }
};
