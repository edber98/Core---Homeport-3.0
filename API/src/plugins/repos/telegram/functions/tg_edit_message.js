const { flattenMessage } = require("./utils").utils;

module.exports = {
  async tg_edit_message(node, msg, inputs, opts) {
      const { telegramRequest } = require("./utils").utils;
      const args = inputs || {};
      const body = {};
      if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
      if (args.message_id !== undefined && args.message_id !== null && args.message_id !== "") body.message_id = args.message_id;
      if (args.text !== undefined && args.text !== null && args.text !== "") body.text = args.text;
      if (args.parse_mode !== undefined && args.parse_mode !== null && args.parse_mode !== "") body.parse_mode = args.parse_mode;
      return flattenMessage(await telegramRequest(opts, "editMessageText", body));
    }
};
