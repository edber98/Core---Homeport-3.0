const { utils } = require("./utils");

module.exports = {
  async pipedrive_activity_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const activityId = (d.activityId || "").toString().trim();
    if (!activityId) return { ok: false, error: "Missing activityId." };

    const body = {};
    if (d.subject) body.subject = d.subject;
    if (d.type) body.type = d.type;
    if (d.due_date) body.due_date = d.due_date;
    if (d.done !== undefined && d.done !== "") body.done = parseInt(d.done, 10);

    if (Object.keys(body).length === 0) return { ok: false, error: "No fields to update." };

    const res = await utils.pdRequest(opts, `/activities/${encodeURIComponent(activityId)}`, { method: "PUT", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, subject: r.subject, type: r.type, due_date: r.due_date, due_time: r.due_time, done: r.done, deal_id: r.deal_id, person_id: r.person_id, org_id: r.org_id, add_time: r.add_time };
  }
};
