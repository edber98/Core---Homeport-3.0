const { utils } = require("./utils");

module.exports = {
  async intercom_conversation_reply(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!(d.conversationId || "").trim()) return { ok: false, error: "Missing conversationId." };
    if (!(d.messageText ?? d.noteBody || "").trim()) return { ok: false, error: "Missing body." };
    if (!(d.adminId || "").trim()) return { ok: false, error: "Missing adminId." };

    const body = { message_type: d.messageType || "comment", type: d.type || "admin", admin_id: d.adminId, body: d.messageText ?? d.noteBody };
    log('Création en cours...');
    const res = await utils.intercomRequest(opts, `/conversations/${d.conversationId}/reply`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "replied", message: "Réponse envoyée." };
  }
};
