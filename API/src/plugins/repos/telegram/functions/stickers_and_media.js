module.exports = {
  async tg_send_sticker(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { telegramRequest } = require("../utils").utils;
    const args = node.args || {};
    const body = {};
    if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
    if (args.sticker !== undefined && args.sticker !== null && args.sticker !== "") body.sticker = args.sticker;
    const result = await telegramRequest(opts, "sendSticker", body);
    return result;
  },

  async tg_send_video(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { telegramRequest } = require("../utils").utils;
    const args = node.args || {};
    const body = {};
    if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
    if (args.video !== undefined && args.video !== null && args.video !== "") body.video = args.video;
    if (args.caption !== undefined && args.caption !== null && args.caption !== "") body.caption = args.caption;
    if (args.duration !== undefined && args.duration !== null && args.duration !== "") body.duration = Number(args.duration);
    if (args.width !== undefined && args.width !== null && args.width !== "") body.width = Number(args.width);
    if (args.height !== undefined && args.height !== null && args.height !== "") body.height = Number(args.height);
    const result = await telegramRequest(opts, "sendVideo", body);
    return result;
  },

  async tg_send_voice(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { telegramRequest } = require("../utils").utils;
    const args = node.args || {};
    const body = {};
    if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
    if (args.voice !== undefined && args.voice !== null && args.voice !== "") body.voice = args.voice;
    if (args.caption !== undefined && args.caption !== null && args.caption !== "") body.caption = args.caption;
    if (args.duration !== undefined && args.duration !== null && args.duration !== "") body.duration = Number(args.duration);
    const result = await telegramRequest(opts, "sendVoice", body);
    return result;
  }
};
