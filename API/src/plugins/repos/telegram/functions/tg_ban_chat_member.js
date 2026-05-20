
module.exports = {
  async tg_ban_chat_member(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { telegramRequest } = require("./utils").utils;
      const args = inputs || {};
      const body = {};
      if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
      if (args.user_id !== undefined && args.user_id !== null && args.user_id !== "") body.user_id = args.user_id;
      if (args.until_date !== undefined && args.until_date !== null && args.until_date !== "") body.until_date = Number(args.until_date);
      const result = await telegramRequest(opts, "banChatMember", body);
      return result;
    }
};
