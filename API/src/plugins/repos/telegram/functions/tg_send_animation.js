const { flattenMessage } = require('./utils').utils;
module.exports = {
  async tg_send_animation(node, msg, inputs, opts) {
    const { telegramRequest, telegramMultipartRequest, resolveFileArg } = require('./utils').utils;
    const d = inputs || {};
    const resolved = await resolveFileArg(d.animation, opts);
    if (resolved && resolved.buffer) {
      const fields = { chat_id: d.chat_id, caption: d.caption, parse_mode: d.parse_mode };
      return flattenMessage(await telegramMultipartRequest(opts, 'sendAnimation', fields, 'animation', resolved.buffer, resolved.fileName, resolved.mimeType));
    }
    const body = { chat_id: d.chat_id, caption: d.caption, parse_mode: d.parse_mode };
    if (resolved && resolved.value) body.animation = resolved.value;
    else if (d.animation) body.animation = d.animation;
    return flattenMessage(await telegramRequest(opts, 'sendAnimation', body));
  }
};
