const { utils } = require("./utils");

module.exports = {
  async pipedrive_deal_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const dealId = (d.dealId || "").toString().trim();
    if (!dealId) return { ok: false, error: "Missing dealId." };

    const body = {};
    if (d.title) body.title = d.title;
    if (d.value) body.value = d.value;
    if (d.stage_id) body.stage_id = parseInt(d.stage_id, 10);
    if (d.status) body.status = d.status;

    if (Object.keys(body).length === 0) return { ok: false, error: "No fields to update." };

    const res = await utils.pdRequest(opts, `/deals/${encodeURIComponent(dealId)}`, { method: "PUT", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: r.id, title: r.title, value: r.value, currency: r.currency, stage_id: r.stage_id, pipeline_id: r.pipeline_id, status: r.status, person_id: r.person_id?.value || r.person_id, org_id: r.org_id?.value || r.org_id, add_time: r.add_time };
  }
};
