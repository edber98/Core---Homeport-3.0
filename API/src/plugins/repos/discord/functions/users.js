module.exports = {
  async discord_get_user(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { discordRequest } = require("../utils").utils;
    const args = node.args || {};
    const userId = args.user_id || "";
    const result = await discordRequest(opts, "GET", `/users/${userId}`);
    return result;
  },

  async discord_get_me(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { discordRequest } = require("../utils").utils;
    const args = node.args || {};
    const result = await discordRequest(opts, "GET", `/users/@me`);
    return result;
  }
};
