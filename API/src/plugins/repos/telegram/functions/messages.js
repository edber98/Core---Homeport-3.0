module.exports = {
  async tg_send_message(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { telegramRequest } = require("../utils").utils;
    const args = node.args || {};
    const body = {};
    if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
    if (args.text !== undefined && args.text !== null && args.text !== "") body.text = args.text;
    if (args.parse_mode !== undefined && args.parse_mode !== null && args.parse_mode !== "") body.parse_mode = args.parse_mode;
    if (args.disable_web_page_preview !== undefined) body.disable_web_page_preview = !!args.disable_web_page_preview;
    if (args.disable_notification !== undefined) body.disable_notification = !!args.disable_notification;
    if (args.reply_to_message_id !== undefined && args.reply_to_message_id !== null && args.reply_to_message_id !== "") body.reply_to_message_id = args.reply_to_message_id;
    const result = await telegramRequest(opts, "sendMessage", body);
    return result;
  },

  async tg_forward_message(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { telegramRequest } = require("../utils").utils;
    const args = node.args || {};
    const body = {};
    if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
    if (args.from_chat_id !== undefined && args.from_chat_id !== null && args.from_chat_id !== "") body.from_chat_id = args.from_chat_id;
    if (args.message_id !== undefined && args.message_id !== null && args.message_id !== "") body.message_id = args.message_id;
    if (args.disable_notification !== undefined) body.disable_notification = !!args.disable_notification;
    const result = await telegramRequest(opts, "forwardMessage", body);
    return result;
  },

  async tg_copy_message(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { telegramRequest } = require("../utils").utils;
    const args = node.args || {};
    const body = {};
    if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
    if (args.from_chat_id !== undefined && args.from_chat_id !== null && args.from_chat_id !== "") body.from_chat_id = args.from_chat_id;
    if (args.message_id !== undefined && args.message_id !== null && args.message_id !== "") body.message_id = args.message_id;
    if (args.caption !== undefined && args.caption !== null && args.caption !== "") body.caption = args.caption;
    const result = await telegramRequest(opts, "copyMessage", body);
    return result;
  },

  async tg_edit_message(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { telegramRequest } = require("../utils").utils;
    const args = node.args || {};
    const body = {};
    if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
    if (args.message_id !== undefined && args.message_id !== null && args.message_id !== "") body.message_id = args.message_id;
    if (args.text !== undefined && args.text !== null && args.text !== "") body.text = args.text;
    if (args.parse_mode !== undefined && args.parse_mode !== null && args.parse_mode !== "") body.parse_mode = args.parse_mode;
    const result = await telegramRequest(opts, "editMessageText", body);
    return result;
  },

  async tg_delete_message(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { telegramRequest } = require("../utils").utils;
    const args = node.args || {};
    const body = {};
    if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
    if (args.message_id !== undefined && args.message_id !== null && args.message_id !== "") body.message_id = args.message_id;
    const result = await telegramRequest(opts, "deleteMessage", body);
    return result;
  },

  async tg_send_photo(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { telegramRequest } = require("../utils").utils;
    const args = node.args || {};
    const body = {};
    if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
    if (args.photo !== undefined && args.photo !== null && args.photo !== "") body.photo = args.photo;
    if (args.caption !== undefined && args.caption !== null && args.caption !== "") body.caption = args.caption;
    if (args.parse_mode !== undefined && args.parse_mode !== null && args.parse_mode !== "") body.parse_mode = args.parse_mode;
    const result = await telegramRequest(opts, "sendPhoto", body);
    return result;
  },

  async tg_send_document(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { telegramRequest } = require("../utils").utils;
    const args = node.args || {};
    const body = {};
    if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
    if (args.document !== undefined && args.document !== null && args.document !== "") body.document = args.document;
    if (args.caption !== undefined && args.caption !== null && args.caption !== "") body.caption = args.caption;
    const result = await telegramRequest(opts, "sendDocument", body);
    return result;
  },

  async tg_send_location(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { telegramRequest } = require("../utils").utils;
    const args = node.args || {};
    const body = {};
    if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
    if (args.latitude !== undefined && args.latitude !== null && args.latitude !== "") body.latitude = Number(args.latitude);
    if (args.longitude !== undefined && args.longitude !== null && args.longitude !== "") body.longitude = Number(args.longitude);
    if (args.live_period !== undefined && args.live_period !== null && args.live_period !== "") body.live_period = Number(args.live_period);
    const result = await telegramRequest(opts, "sendLocation", body);
    return result;
  }
};
