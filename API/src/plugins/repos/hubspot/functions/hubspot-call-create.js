const { utils } = require("./utils");

module.exports = {
  async hubspot_call_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const title = (d.hs_call_title || "").trim();
    if (!title) return { ok: false, error: "Missing hs_call_title." };

    const properties = { hs_call_title: title };
    if (d.hs_call_body) properties.hs_call_body = d.hs_call_body;
    if (d.hs_call_duration) properties.hs_call_duration = d.hs_call_duration;
    if (d.hs_call_direction) properties.hs_call_direction = d.hs_call_direction;

    const res = await utils.hubspotRequest(opts, "/crm/v3/objects/calls", {
      method: "POST",
      body: { properties }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, type: "call", body: (r.properties || {}).hs_call_body, timestamp: (r.properties || {}).hs_timestamp, createdate: r.createdAt };
  }
};
