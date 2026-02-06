const { utils } = require("./utils");

module.exports = {
  async hubspot_task_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const subject = (d.hs_task_subject || "").trim();
    if (!subject) return { ok: false, error: "Missing hs_task_subject." };

    const properties = { hs_task_subject: subject };
    if (d.hs_task_body) properties.hs_task_body = d.hs_task_body;
    if (d.hs_task_status) properties.hs_task_status = d.hs_task_status;
    if (d.hs_timestamp) properties.hs_timestamp = d.hs_timestamp;

    const res = await utils.hubspotRequest(opts, "/crm/v3/objects/tasks", {
      method: "POST",
      body: { properties }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, type: "task", body: (r.properties || {}).hs_task_body, timestamp: (r.properties || {}).hs_timestamp, createdate: r.createdAt };
  }
};
