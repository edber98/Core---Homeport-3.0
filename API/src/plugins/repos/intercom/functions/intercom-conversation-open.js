const { utils } = require("./utils");

module.exports = {
  async intercom_conversation_open(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!(d.conversationId || "").trim()) return { ok: false, error: "Missing conversationId." };
    if (!(d.adminId || "").trim()) return { ok: false, error: "Missing adminId." };

    const body = { message_type: "open", admin_id: d.adminId };
    const res = await utils.intercomRequest(opts, `/conversations/${d.conversationId}/parts`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "opened", message: "Conversation rouverte." };
  }
};
