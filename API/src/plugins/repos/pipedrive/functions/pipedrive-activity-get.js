const { utils } = require("./utils");

module.exports = {
  async pipedrive_activity_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const activityId = (d.activityId || "").toString().trim();
    if (!activityId) return { ok: false, error: "Missing activityId." };

    const res = await utils.pdRequest(opts, `/activities/${encodeURIComponent(activityId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, subject: r.subject, type: r.type, due_date: r.due_date, due_time: r.due_time, done: r.done, deal_id: r.deal_id, person_id: r.person_id, org_id: r.org_id, add_time: r.add_time };
  }
};
