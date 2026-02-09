const { utils } = require("./utils");

module.exports = {
  async intercom_conversation_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!(d.conversationId || "").trim()) return { ok: false, error: "Missing conversationId." };

    const res = await utils.intercomRequest(opts, `/conversations/${d.conversationId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.id, type: r.type || "", title: r.title || "", state: r.state || "", priority: r.priority || "", adminAssigneeId: r.admin_assignee_id?.toString() || "", createdAt: String(r.created_at || ""), updatedAt: String(r.updated_at || "") };
  }
};
