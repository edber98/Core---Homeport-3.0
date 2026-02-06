const { utils } = require("./utils");

module.exports = {
  async hubspot_contact_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const contactId = (d.contactId || "").toString().trim();
    if (!contactId) return { ok: false, error: "Missing contactId." };

    const props = "email,firstname,lastname,phone,company";
    const res = await utils.hubspotRequest(opts, `/crm/v3/objects/contacts/${encodeURIComponent(contactId)}`, {
      query: { properties: props }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, ...r.properties, createdate: r.createdAt };
  }
};
