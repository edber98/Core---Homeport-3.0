
module.exports = {
  async tg_set_chat_title(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { telegramRequest } = require("./utils").utils;
      const args = inputs || {};
      const body = {};
      if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
      if (args.title !== undefined && args.title !== null && args.title !== "") body.title = args.title;
      const result = await telegramRequest(opts, "setChatTitle", body);
      return result;
    }
};
