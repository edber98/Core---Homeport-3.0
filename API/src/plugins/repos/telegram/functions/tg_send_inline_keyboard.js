
module.exports = {
  async tg_send_inline_keyboard(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { telegramRequest } = require("./utils").utils;
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
    }
};
