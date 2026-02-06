const { utils } = require("./utils");

module.exports = {
  async intercom_conversation_assign(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!(d.conversationId || "").trim()) return { ok: false, error: "Missing conversationId." };
    if (!(d.adminId || "").trim()) return { ok: false, error: "Missing adminId." };
    if (!(d.assigneeId || "").trim()) return { ok: false, error: "Missing assigneeId." };

    const body = { message_type: "assignment", type: "admin", admin_id: d.adminId, assignee_id: d.assigneeId };
    if (d.body) body.body = d.body;
    const res = await utils.intercomRequest(opts, `/conversations/${d.conversationId}/parts`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "assigned", message: "Conversation assignée." };
  }
};
