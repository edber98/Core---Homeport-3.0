const { utils } = require("./utils");

module.exports = {
  async facebook_send_message(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const pageId = (d.pageId || "").trim();
    if (!pageId) return { ok: false, error: "Missing pageId." };
    const recipientId = (d.recipientId || "").trim();
    if (!recipientId) return { ok: false, error: "Missing recipientId." };
    const text = (d.text || "").trim();
    if (!text) return { ok: false, error: "Missing text." };

    log('Création en cours...');
    const res = await utils.facebookRequest(opts, `/${encodeURIComponent(pageId)}/messages`, {
      method: "POST",
      body: {
        recipient: { id: recipientId },
        message: { text },
        messaging_type: "RESPONSE"
      }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, recipientId: r.recipient_id, messageId: r.message_id };
  }
};
