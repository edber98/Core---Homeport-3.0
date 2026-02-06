const { utils } = require("./utils");

module.exports = {
  async pipedrive_activity_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const subject = (d.subject || "").trim();
    if (!subject) return { ok: false, error: "Missing subject." };
    const type = (d.type || "").trim();
    if (!type) return { ok: false, error: "Missing type." };

    const body = { subject, type };
    if (d.due_date) body.due_date = d.due_date;
    if (d.due_time) body.due_time = d.due_time;
    if (d.deal_id) body.deal_id = parseInt(d.deal_id, 10);
    if (d.person_id) body.person_id = parseInt(d.person_id, 10);
    if (d.org_id) body.org_id = parseInt(d.org_id, 10);

    const res = await utils.pdRequest(opts, "/activities", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, subject: r.subject, type: r.type, due_date: r.due_date, due_time: r.due_time, done: r.done, deal_id: r.deal_id, person_id: r.person_id, org_id: r.org_id, add_time: r.add_time };
  }
};
