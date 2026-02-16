const { utils } = require("./utils");

module.exports = {
  async hubspot_contact_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const contactId = (d.contactId || "").toString().trim();
    if (!contactId) return { ok: false, error: "Missing contactId." };

    const properties = {};
    if (d.email) properties.email = d.email;
    if (d.firstname) properties.firstname = d.firstname;
    if (d.lastname) properties.lastname = d.lastname;
    if (d.phone) properties.phone = d.phone;

    if (Object.keys(properties).length === 0) return { ok: false, error: "No fields to update." };

    log('Mise à jour en cours...');
    const res = await utils.hubspotRequest(opts, `/crm/v3/objects/contacts/${encodeURIComponent(contactId)}`, {
      method: "PATCH",
      body: { properties }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, ...r.properties, createdate: r.createdAt };
  }
};
