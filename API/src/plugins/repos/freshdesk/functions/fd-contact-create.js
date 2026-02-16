const { utils } = require("./utils");

module.exports = {
  async fd_contact_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.name) return { ok: false, error: "Missing name." };

    const body = { name: d.name };
    if (d.email) body.email = d.email;
    if (d.phone) body.phone = d.phone;
    if (d.companyId) body.company_id = parseInt(d.companyId, 10);

    log('Création en cours...');
    const res = await utils.freshdeskRequest(opts, "/contacts", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: String(r.id || ""), name: r.name || "", email: r.email || "", phone: r.phone || "", companyId: String(r.company_id || ""), createdAt: r.created_at || "" };
  }
};
