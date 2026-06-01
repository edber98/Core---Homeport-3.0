module.exports = {
  async tg_send_media_group(node, msg, inputs, opts) {
    const { telegramRequest } = require('./utils').utils;
    const d = inputs || {};
    if (!d.chat_id) return { ok: false, error: 'chat_id requis.' };
    let media = d.media;
    if (typeof media !== 'object') { try { media = JSON.parse(String(media || '[]')); } catch { return { ok: false, error: 'media JSON invalide.' }; } }
    const res = await telegramRequest(opts, 'sendMediaGroup', { chat_id: d.chat_id, media });
    if (!res.ok) return res;
    const items = Array.isArray(res) ? res : (Array.isArray(res.messages) ? res.messages : []);
    return { ok: true, messages: items, totalCount: items.length };
  }
};
