
module.exports = {
  async tg_get_chat(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { telegramRequest } = require("./utils").utils;
      const args = inputs || {};
      const body = {};
      if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
      const result = await telegramRequest(opts, "getChat", body);
      return result;
    }
};
