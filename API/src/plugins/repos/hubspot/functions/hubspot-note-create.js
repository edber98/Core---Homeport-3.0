const { utils } = require("./utils");

module.exports = {
  async hubspot_note_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const body = (d.hs_note_body || "").trim();
    if (!body) return { ok: false, error: "Missing hs_note_body." };

    const properties = { hs_note_body: body };
    if (d.hs_timestamp) properties.hs_timestamp = d.hs_timestamp;

    const payload = { properties };

    // Build associations if contactId or dealId provided
    const associations = [];
    if (d.contactId) {
      associations.push({
        to: { id: d.contactId },
        types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }]
      });
    }
    if (d.dealId) {
      associations.push({
        to: { id: d.dealId },
        types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 214 }]
      });
    }
    if (associations.length > 0) payload.associations = associations;

    log('Création en cours...');
    const res = await utils.hubspotRequest(opts, "/crm/v3/objects/notes", {
      method: "POST",
      body: payload
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, type: "note", body: (r.properties || {}).hs_note_body, timestamp: (r.properties || {}).hs_timestamp, createdate: r.createdAt };
  }
};
