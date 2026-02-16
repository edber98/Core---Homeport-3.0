const { utils } = require("./utils");

module.exports = {
  async hubspot_contact_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const email = (d.email || "").trim();
    if (!email) return { ok: false, error: "Missing email." };

    const properties = { email };
    if (d.firstname) properties.firstname = d.firstname;
    if (d.lastname) properties.lastname = d.lastname;
    if (d.phone) properties.phone = d.phone;
    if (d.company) properties.company = d.company;

    log('Création en cours...');
    const res = await utils.hubspotRequest(opts, "/crm/v3/objects/contacts", {
      method: "POST",
      body: { properties }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, ...r.properties, createdate: r.createdAt };
  }
};
