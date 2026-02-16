module.exports = {
  async tg_pin_message(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { telegramRequest } = require("../utils").utils;
    const args = inputs || {};
    const body = {};
    if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
    if (args.message_id !== undefined && args.message_id !== null && args.message_id !== "") body.message_id = args.message_id;
    if (args.disable_notification !== undefined) body.disable_notification = !!args.disable_notification;
    const result = await telegramRequest(opts, "pinChatMessage", body);
    return result;
  },

  async tg_unpin_message(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { telegramRequest } = require("../utils").utils;
    const args = inputs || {};
    const body = {};
    if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
    if (args.message_id !== undefined && args.message_id !== null && args.message_id !== "") body.message_id = args.message_id;
    const result = await telegramRequest(opts, "unpinChatMessage", body);
    return result;
  }
};
