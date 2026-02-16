/**
 * Flatten a Telegram Message object to match the $var:tg_message schema.
 */
function flattenMessage(r) {
  if (!r || !r.ok) return r;
  return {
    ok: true,
    message_id: r.message_id || "",
    chat_id: String(r.chat?.id || ""),
    from_id: String(r.from?.id || ""),
    from_username: r.from?.username || "",
    text: r.text || r.caption || "",
    date: r.date || "",
    reply_to_message_id: r.reply_to_message?.message_id || "",
  };
}

module.exports = {
  async tg_send_message(node, msg, inputs, opts) {
    const { telegramRequest } = require("../utils").utils;
    const args = inputs || {};
    const body = {};
    if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
    if (args.text !== undefined && args.text !== null && args.text !== "") body.text = args.text;
    if (args.parse_mode !== undefined && args.parse_mode !== null && args.parse_mode !== "") body.parse_mode = args.parse_mode;
    if (args.disable_web_page_preview !== undefined) body.disable_web_page_preview = !!args.disable_web_page_preview;
    if (args.disable_notification !== undefined) body.disable_notification = !!args.disable_notification;
    if (args.reply_to_message_id !== undefined && args.reply_to_message_id !== null && args.reply_to_message_id !== "") body.reply_to_message_id = args.reply_to_message_id;
    return flattenMessage(await telegramRequest(opts, "sendMessage", body));
  },

  async tg_forward_message(node, msg, inputs, opts) {
    const { telegramRequest } = require("../utils").utils;
    const args = inputs || {};
    const body = {};
    if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
    if (args.from_chat_id !== undefined && args.from_chat_id !== null && args.from_chat_id !== "") body.from_chat_id = args.from_chat_id;
    if (args.message_id !== undefined && args.message_id !== null && args.message_id !== "") body.message_id = args.message_id;
    if (args.disable_notification !== undefined) body.disable_notification = !!args.disable_notification;
    return flattenMessage(await telegramRequest(opts, "forwardMessage", body));
  },

  async tg_copy_message(node, msg, inputs, opts) {
    const { telegramRequest } = require("../utils").utils;
    const args = inputs || {};
    const body = {};
    if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
    if (args.from_chat_id !== undefined && args.from_chat_id !== null && args.from_chat_id !== "") body.from_chat_id = args.from_chat_id;
    if (args.message_id !== undefined && args.message_id !== null && args.message_id !== "") body.message_id = args.message_id;
    if (args.caption !== undefined && args.caption !== null && args.caption !== "") body.caption = args.caption;
    return flattenMessage(await telegramRequest(opts, "copyMessage", body));
  },

  async tg_edit_message(node, msg, inputs, opts) {
    const { telegramRequest } = require("../utils").utils;
    const args = inputs || {};
    const body = {};
    if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
    if (args.message_id !== undefined && args.message_id !== null && args.message_id !== "") body.message_id = args.message_id;
    if (args.text !== undefined && args.text !== null && args.text !== "") body.text = args.text;
    if (args.parse_mode !== undefined && args.parse_mode !== null && args.parse_mode !== "") body.parse_mode = args.parse_mode;
    return flattenMessage(await telegramRequest(opts, "editMessageText", body));
  },

  async tg_delete_message(node, msg, inputs, opts) {
    const { telegramRequest } = require("../utils").utils;
    const args = inputs || {};
    const body = {};
    if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
    if (args.message_id !== undefined && args.message_id !== null && args.message_id !== "") body.message_id = args.message_id;
    const result = await telegramRequest(opts, "deleteMessage", body);
    return result;
  },

  async tg_send_photo(node, msg, inputs, opts) {
    const { telegramRequest, telegramMultipartRequest, resolveFileArg } = require("../utils").utils;
    const args = inputs || {};
    const resolved = await resolveFileArg(args.photo, opts);

    if (resolved && resolved.buffer) {
      const fields = {};
      if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") fields.chat_id = args.chat_id;
      if (args.caption !== undefined && args.caption !== null && args.caption !== "") fields.caption = args.caption;
      if (args.parse_mode !== undefined && args.parse_mode !== null && args.parse_mode !== "") fields.parse_mode = args.parse_mode;
      return flattenMessage(await telegramMultipartRequest(opts, "sendPhoto", fields, "photo", resolved.buffer, resolved.fileName, resolved.mimeType));
    }

    const body = {};
    if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
    if (resolved && resolved.value) body.photo = resolved.value;
    else if (args.photo !== undefined && args.photo !== null && args.photo !== "") body.photo = args.photo;
    if (args.caption !== undefined && args.caption !== null && args.caption !== "") body.caption = args.caption;
    if (args.parse_mode !== undefined && args.parse_mode !== null && args.parse_mode !== "") body.parse_mode = args.parse_mode;
    return flattenMessage(await telegramRequest(opts, "sendPhoto", body));
  },

  async tg_send_document(node, msg, inputs, opts) {
    const { telegramRequest, telegramMultipartRequest, resolveFileArg } = require("../utils").utils;
    const args = inputs || {};
    const resolved = await resolveFileArg(args.document, opts);

    if (resolved && resolved.buffer) {
      const fields = {};
      if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") fields.chat_id = args.chat_id;
      if (args.caption !== undefined && args.caption !== null && args.caption !== "") fields.caption = args.caption;
      return flattenMessage(await telegramMultipartRequest(opts, "sendDocument", fields, "document", resolved.buffer, resolved.fileName, resolved.mimeType));
    }

    const body = {};
    if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
    if (resolved && resolved.value) body.document = resolved.value;
    else if (args.document !== undefined && args.document !== null && args.document !== "") body.document = args.document;
    if (args.caption !== undefined && args.caption !== null && args.caption !== "") body.caption = args.caption;
    return flattenMessage(await telegramRequest(opts, "sendDocument", body));
  },

  async tg_send_location(node, msg, inputs, opts) {
    const { telegramRequest } = require("../utils").utils;
    const args = inputs || {};
    const body = {};
    if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
    if (args.latitude !== undefined && args.latitude !== null && args.latitude !== "") body.latitude = Number(args.latitude);
    if (args.longitude !== undefined && args.longitude !== null && args.longitude !== "") body.longitude = Number(args.longitude);
    if (args.live_period !== undefined && args.live_period !== null && args.live_period !== "") body.live_period = Number(args.live_period);
    return telegramRequest(opts, "sendLocation", body);
  }
};
