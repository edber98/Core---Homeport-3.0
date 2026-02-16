const { utils } = require("./utils");

module.exports = {
  async intercom_conversation_tag(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!(d.conversationId || "").trim()) return { ok: false, error: "Missing conversationId." };
    if (!(d.tagId || "").trim()) return { ok: false, error: "Missing tagId." };
    if (!(d.adminId || "").trim()) return { ok: false, error: "Missing adminId." };

    const body = { id: d.tagId, admin_id: d.adminId };
    log('Appel API en cours...');
    const res = await utils.intercomRequest(opts, `/conversations/${d.conversationId}/tags`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "tagged", message: "Tag ajouté à la conversation." };
  }
};
