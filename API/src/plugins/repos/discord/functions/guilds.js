module.exports = {
  async discord_get_guild(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { discordRequest } = require("../utils").utils;
    const args = node.args || {};
    const guildId = args.guild_id || "";
    const result = await discordRequest(opts, "GET", `/guilds/${guildId}`);
    return result;
  },

  async discord_list_guild_channels(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { discordRequest } = require("../utils").utils;
    const args = node.args || {};
    const guildId = args.guild_id || "";
    const result = await discordRequest(opts, "GET", `/guilds/${guildId}/channels`);
    return result;
  },

  async discord_list_guild_members(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { discordRequest } = require("../utils").utils;
    const args = node.args || {};
    const guildId = args.guild_id || "";
    const params = [];
    if (args.limit !== undefined && args.limit !== null && args.limit !== "") params.push(`limit=${Number(args.limit)}`);
    if (args.after !== undefined && args.after !== null && args.after !== "") params.push(`after=${args.after}`);
    const qs = params.length ? `?${params.join("&")}` : "";
    const result = await discordRequest(opts, "GET", `/guilds/${guildId}/members${qs}`);
    return result;
  }
};
