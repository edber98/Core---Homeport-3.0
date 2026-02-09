const { utils } = require("./utils");

module.exports = {
  async hubspot_meeting_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const title = (d.hs_meeting_title || "").trim();
    if (!title) return { ok: false, error: "Missing hs_meeting_title." };

    const properties = { hs_meeting_title: title };
    if (d.hs_meeting_body) properties.hs_meeting_body = d.hs_meeting_body;
    if (d.hs_meeting_start_time) properties.hs_meeting_start_time = d.hs_meeting_start_time;
    if (d.hs_meeting_end_time) properties.hs_meeting_end_time = d.hs_meeting_end_time;

    const res = await utils.hubspotRequest(opts, "/crm/v3/objects/meetings", {
      method: "POST",
      body: { properties }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, type: "meeting", body: (r.properties || {}).hs_meeting_body, timestamp: (r.properties || {}).hs_meeting_start_time, createdate: r.createdAt };
  }
};
