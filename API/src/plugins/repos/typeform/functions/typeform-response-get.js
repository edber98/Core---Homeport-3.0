const { utils } = require("./utils");

module.exports = {
  async typeform_response_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!(d.formId || "").trim()) return { ok: false, error: "Missing formId." };
    if (!(d.responseId || "").trim()) return { ok: false, error: "Missing responseId." };

    const res = await utils.typeformRequest(opts, `/forms/${d.formId}/responses`, { query: { included_response_ids: d.responseId } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = (res.data && res.data.items) || [];
    const r = items[0] || {};
    return { ok: true, responseId: r.response_id || r.token || d.responseId, formId: d.formId, landedAt: r.landed_at || "", submittedAt: r.submitted_at || "", answers: JSON.stringify(r.answers || []) };
  }
};
