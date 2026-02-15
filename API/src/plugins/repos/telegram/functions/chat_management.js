module.exports = {
  async tg_get_chat(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { telegramRequest } = require("../utils").utils;
    const args = inputs || {};
    const body = {};
    if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
    const result = await telegramRequest(opts, "getChat", body);
    return result;
  },

  async tg_get_chat_members_count(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { telegramRequest } = require("../utils").utils;
    const args = inputs || {};
    const body = {};
    if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
    const result = await telegramRequest(opts, "getChatMemberCount", body);
    return result;
  },

  async tg_get_chat_member(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { telegramRequest } = require("../utils").utils;
    const args = inputs || {};
    const body = {};
    if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
    if (args.user_id !== undefined && args.user_id !== null && args.user_id !== "") body.user_id = args.user_id;
    const result = await telegramRequest(opts, "getChatMember", body);
    return result;
  },

  async tg_ban_chat_member(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { telegramRequest } = require("../utils").utils;
    const args = inputs || {};
    const body = {};
    if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
    if (args.user_id !== undefined && args.user_id !== null && args.user_id !== "") body.user_id = args.user_id;
    if (args.until_date !== undefined && args.until_date !== null && args.until_date !== "") body.until_date = Number(args.until_date);
    const result = await telegramRequest(opts, "banChatMember", body);
    return result;
  },

  async tg_unban_chat_member(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { telegramRequest } = require("../utils").utils;
    const args = inputs || {};
    const body = {};
    if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
    if (args.user_id !== undefined && args.user_id !== null && args.user_id !== "") body.user_id = args.user_id;
    if (args.only_if_banned !== undefined) body.only_if_banned = !!args.only_if_banned;
    const result = await telegramRequest(opts, "unbanChatMember", body);
    return result;
  },

  async tg_set_chat_title(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { telegramRequest } = require("../utils").utils;
    const args = inputs || {};
    const body = {};
    if (args.chat_id !== undefined && args.chat_id !== null && args.chat_id !== "") body.chat_id = args.chat_id;
    if (args.title !== undefined && args.title !== null && args.title !== "") body.title = args.title;
    const result = await telegramRequest(opts, "setChatTitle", body);
    return result;
  }
};
