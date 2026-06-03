const { flattenMessage } = require("./utils").utils;

module.exports = {
  async tg_send_message(node, msg, inputs, opts) {
      const { telegramRequest } = require("./utils").utils;
      const args = inputs || {};
      const body = {};
      if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
      if (args.text !== undefined && args.text !== null && args.text !== "") body.text = args.text;
      if (args.parse_mode !== undefined && args.parse_mode !== null && args.parse_mode !== "") body.parse_mode = args.parse_mode;
      if (args.disable_web_page_preview !== undefined) body.disable_web_page_preview = !!args.disable_web_page_preview;
      if (args.disable_notification !== undefined) body.disable_notification = !!args.disable_notification;
      if (args.reply_to_message_id !== undefined && args.reply_to_message_id !== null && args.reply_to_message_id !== "") body.reply_to_message_id = args.reply_to_message_id;
      return flattenMessage(await telegramRequest(opts, "sendMessage", body));
    }
};
