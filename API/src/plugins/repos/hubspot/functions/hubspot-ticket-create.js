const { utils } = require("./utils");

module.exports = {
  async hubspot_ticket_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const subject = (d.subject || "").trim();
    if (!subject) return { ok: false, error: "Missing subject." };

    const properties = { subject };
    if (d.content) properties.content = d.content;
    if (d.hs_pipeline) properties.hs_pipeline = d.hs_pipeline;
    if (d.hs_pipeline_stage) properties.hs_pipeline_stage = d.hs_pipeline_stage;
    if (d.hs_ticket_priority) properties.hs_ticket_priority = d.hs_ticket_priority;

    log('Création en cours...');
    const res = await utils.hubspotRequest(opts, "/crm/v3/objects/tickets", {
      method: "POST",
      body: { properties }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, ...r.properties, createdate: r.createdAt };
  }
};
