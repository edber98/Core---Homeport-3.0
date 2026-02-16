const { utils } = require("./utils");

module.exports = {
  async googlechat_post_message(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const text = (inputs || {}).text;
    if (!text) return { ok: false, error: "Missing text." };
    log('Envoi du prompt...');
    const res = await utils.chatWebhookRequest(opts, { text });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "sent", message: "Message sent successfully." };
  }
};
