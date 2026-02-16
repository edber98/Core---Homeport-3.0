module.exports = {
  async tg_send_inline_keyboard(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { telegramRequest } = require("../utils").utils;
    const args = inputs || {};
    const body = {};
    if (args.chat_id) body.chat_id = args.chat_id;
    if (args.text) body.text = args.text;
    if (args.buttons) {
      try { body.reply_markup = { inline_keyboard: JSON.parse(args.buttons) }; }
      catch (e) { return { ok: false, error: "JSON invalide pour les boutons: " + e.message }; }
    }
    const result = await telegramRequest(opts, "sendMessage", body);
    return result;
  },

  async tg_answer_callback(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { telegramRequest } = require("../utils").utils;
    const args = inputs || {};
    const body = {};
    if (args.callback_query_id !== undefined && args.callback_query_id !== null && args.callback_query_id !== "") body.callback_query_id = args.callback_query_id;
    if (args.text !== undefined && args.text !== null && args.text !== "") body.text = args.text;
    if (args.show_alert !== undefined) body.show_alert = !!args.show_alert;
    const result = await telegramRequest(opts, "answerCallbackQuery", body);
    return result;
  },

  async tg_edit_reply_markup(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { telegramRequest } = require("../utils").utils;
    const args = inputs || {};
    const body = {};
    if (args.chat_id) body.chat_id = args.chat_id;
    if (args.message_id) body.message_id = args.message_id;
    if (args.buttons) {
      try { body.reply_markup = { inline_keyboard: JSON.parse(args.buttons) }; }
      catch (e) { return { ok: false, error: "JSON invalide pour les boutons: " + e.message }; }
    }
    const result = await telegramRequest(opts, "editMessageReplyMarkup", body);
    return result;
  }
};
