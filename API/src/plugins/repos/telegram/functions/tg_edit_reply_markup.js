
module.exports = {
  async tg_edit_reply_markup(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { telegramRequest } = require("./utils").utils;
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
