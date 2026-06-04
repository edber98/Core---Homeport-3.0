const { utils } = require("./utils");

module.exports = {
  async intercom_conversation_close(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!(d.conversationId || "").trim()) return { ok: false, error: "Missing conversationId." };
    if (!(d.adminId || "").trim()) return { ok: false, error: "Missing adminId." };

    const body = { message_type: "close", type: "admin", admin_id: d.adminId };
    if (d.messageText ?? d.noteBody) body.body = d.messageText ?? d.noteBody;
    log('Appel API en cours...');
    const res = await utils.intercomRequest(opts, `/conversations/${d.conversationId}/parts`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "closed", message: "Conversation fermée." };
  }
};
