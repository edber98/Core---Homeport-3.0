const { utils } = require("./utils");

module.exports = {
  async mc_segment_update(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.listId) return { ok: false, error: "Missing listId." };
    if (!d.segmentId) return { ok: false, error: "Missing segmentId." };

    const body = {};
    if (d.name) body.name = d.name;
    if (d.staticSegment) {
      body.static_segment = Array.isArray(d.staticSegment) ? d.staticSegment : JSON.parse(String(d.staticSegment));
    }

    const res = await utils.mailchimpRequest(opts, `/lists/${d.listId}/segments/${d.segmentId}`, { method: "PATCH", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: String(r.id || d.segmentId), name: r.name || "", memberCount: String(r.member_count || 0), createdAt: r.created_at || "" };
  }
};
