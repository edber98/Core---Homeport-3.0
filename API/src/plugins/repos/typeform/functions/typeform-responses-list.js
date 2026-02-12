const { utils } = require("./utils");

module.exports = {
  async typeform_responses_list(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!(d.formId || "").trim()) return { ok: false, error: "Missing formId." };

    const query = {};
    if (d.pageSize) query.page_size = d.pageSize;
    if (d.since) query.since = d.since;
    if (d.until) query.until = d.until;
    if (d.after) query.after = d.after;

    const res = await utils.typeformRequest(opts, `/forms/${d.formId}/responses`, { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = (res.data && res.data.items) || [];
    const responses = items.map(r => ({ responseId: r.response_id || r.token, formId: d.formId, landedAt: r.landed_at || "", submittedAt: r.submitted_at || "", answers: JSON.stringify(r.answers || []) }));
    return { ok: true, responses, totalCount: res.data?.total_items || responses.length, totalPages: res.data?.page_count || 0 };
  }
};
