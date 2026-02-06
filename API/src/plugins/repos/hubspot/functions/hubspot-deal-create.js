const { utils } = require("./utils");

module.exports = {
  async hubspot_deal_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const dealname = (d.dealname || "").trim();
    if (!dealname) return { ok: false, error: "Missing dealname." };

    const properties = { dealname };
    if (d.amount) properties.amount = d.amount;
    if (d.pipeline) properties.pipeline = d.pipeline;
    if (d.dealstage) properties.dealstage = d.dealstage;

    const res = await utils.hubspotRequest(opts, "/crm/v3/objects/deals", {
      method: "POST",
      body: { properties }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, ...r.properties, createdate: r.createdAt };
  }
};
