const { utils } = require("./utils");

module.exports = {
  async hubspot_ticket_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const ticketId = (d.ticketId || "").toString().trim();
    if (!ticketId) return { ok: false, error: "Missing ticketId." };

    const properties = {};
    if (d.subject) properties.subject = d.subject;
    if (d.content) properties.content = d.content;
    if (d.hs_pipeline_stage) properties.hs_pipeline_stage = d.hs_pipeline_stage;

    if (Object.keys(properties).length === 0) return { ok: false, error: "No fields to update." };

    log('Mise à jour en cours...');
    const res = await utils.hubspotRequest(opts, `/crm/v3/objects/tickets/${encodeURIComponent(ticketId)}`, {
      method: "PATCH",
      body: { properties }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, ...r.properties, createdate: r.createdAt };
  }
};
