module.exports = {
  async discord_create_thread(node, msg, inputs, opts) {
    const { discordRequest } = require("../utils").utils;
    const args = node.args || {};
    const channelId = args.channel_id || "";
    const body = {};
    if (args.name !== undefined && args.name !== null && args.name !== "") body.name = args.name;
    if (args.auto_archive_duration !== undefined && args.auto_archive_duration !== null && args.auto_archive_duration !== "") body.auto_archive_duration = Number(args.auto_archive_duration);
    if (args.message_id !== undefined && args.message_id !== null && args.message_id !== "") {
      const result = await discordRequest(opts, "POST", `/channels/${channelId}/messages/${args.message_id}/threads`, body);
      return result;
    }
    body.type = 11;
    const result = await discordRequest(opts, "POST", `/channels/${channelId}/threads`, body);
    return result;
  },

  async discord_list_threads(node, msg, inputs, opts) {
    const { discordRequest } = require("../utils").utils;
    const args = node.args || {};
    const guildId = args.guild_id || "";
    const result = await discordRequest(opts, "GET", `/guilds/${guildId}/threads/active`);
    return result;
  }
};
