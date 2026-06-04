const { utils } = require("./utils");

module.exports = {
  async brevo_contact_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const email = (d.email || "").trim();
    if (!email) return { ok: false, error: "Missing email." };

    const body = { email };
    const attributes = {};
    if (d.firstName) attributes.FIRSTNAME = d.firstName;
    if (d.lastName) attributes.LASTNAME = d.lastName;
    if (d.phone) attributes.SMS = d.phone;
    if (d.customAttributes) {
      try { Object.assign(attributes, JSON.parse(d.customAttributes)); } catch {}
    }
    if (Object.keys(attributes).length) body.attributes = attributes;

    log('Création en cours...');
    const res = await utils.brevoRequest(opts, "/contacts", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: String(r.id || ""), email, firstName: d.firstName || "", lastName: d.lastName || "", phone: d.phone || "", createdAt: new Date().toISOString() };
  }
};
