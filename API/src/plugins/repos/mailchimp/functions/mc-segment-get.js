const { utils } = require("./utils");

module.exports = {
  async mc_segment_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.listId) return { ok: false, error: "Missing listId." };
    const segmentId = parseInt(d.segmentId, 10);
    if (isNaN(segmentId)) return { ok: false, error: "Missing segmentId." };

    const res = await utils.mailchimpRequest(opts, `/lists/${d.listId}/segments/${segmentId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: String(r.id || ""), name: r.name || "", memberCount: String(r.member_count || 0), createdAt: r.created_at || "" };
  }
};
