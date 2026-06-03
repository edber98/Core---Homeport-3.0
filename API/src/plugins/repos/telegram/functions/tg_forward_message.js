const { flattenMessage } = require("./utils").utils;

module.exports = {
  async tg_forward_message(node, msg, inputs, opts) {
      const { telegramRequest } = require("./utils").utils;
      const args = inputs || {};
      const body = {};
      if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
      if (args.from_chat_id !== undefined && args.from_chat_id !== null && args.from_chat_id !== "") body.from_chat_id = args.from_chat_id;
      if (args.message_id !== undefined && args.message_id !== null && args.message_id !== "") body.message_id = args.message_id;
      if (args.disable_notification !== undefined) body.disable_notification = !!args.disable_notification;
      return flattenMessage(await telegramRequest(opts, "forwardMessage", body));
    }
};
