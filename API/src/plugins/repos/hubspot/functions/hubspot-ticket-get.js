const { utils } = require("./utils");

module.exports = {
  async hubspot_ticket_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const ticketId = (d.ticketId || "").toString().trim();
    if (!ticketId) return { ok: false, error: "Missing ticketId." };

    const props = "subject,content,hs_pipeline,hs_pipeline_stage,hs_ticket_priority";
    const res = await utils.hubspotRequest(opts, `/crm/v3/objects/tickets/${encodeURIComponent(ticketId)}`, {
      query: { properties: props }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, ...r.properties, createdate: r.createdAt };
  }
};
