
module.exports = {
  async tg_unban_chat_member(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const { telegramRequest } = require("./utils").utils;
      const args = inputs || {};
      const body = {};
      if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
      if (args.user_id !== undefined && args.user_id !== null && args.user_id !== "") body.user_id = args.user_id;
      if (args.only_if_banned !== undefined) body.only_if_banned = !!args.only_if_banned;
      const result = await telegramRequest(opts, "unbanChatMember", body);
      return result;
    }
};
