module.exports = {
  async discord_get_channel(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { discordRequest } = require("../utils").utils;
    const args = inputs || {};
    const channelId = args.channel_id || "";
    const result = await discordRequest(opts, "GET", `/channels/${channelId}`);
    return result;
  },

  async discord_list_channels(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { discordRequest } = require("../utils").utils;
    const args = inputs || {};
    const guildId = args.guild_id || "";
    const result = await discordRequest(opts, "GET", `/guilds/${guildId}/channels`);
    return result;
  },

  async discord_create_channel(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { discordRequest } = require("../utils").utils;
    const args = inputs || {};
    const guildId = args.guild_id || "";
    const body = {};
    if (args.name !== undefined && args.name !== null && args.name !== "") body.name = args.name;
    if (args.type !== undefined && args.type !== null && args.type !== "") body.type = Number(args.type);
    if (args.topic !== undefined && args.topic !== null && args.topic !== "") body.topic = args.topic;
    if (args.parent_id !== undefined && args.parent_id !== null && args.parent_id !== "") body.parent_id = args.parent_id;
    const result = await discordRequest(opts, "POST", `/guilds/${guildId}/channels`, body);
    return result;
  },

  async discord_modify_channel(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { discordRequest } = require("../utils").utils;
    const args = inputs || {};
    const channelId = args.channel_id || "";
    const body = {};
    if (args.name !== undefined && args.name !== null && args.name !== "") body.name = args.name;
    if (args.topic !== undefined && args.topic !== null && args.topic !== "") body.topic = args.topic;
    if (args.nsfw !== undefined) body.nsfw = !!args.nsfw;
    if (args.rate_limit_per_user !== undefined && args.rate_limit_per_user !== null && args.rate_limit_per_user !== "") body.rate_limit_per_user = Number(args.rate_limit_per_user);
    const result = await discordRequest(opts, "PATCH", `/channels/${channelId}`, body);
    return result;
  },

  async discord_delete_channel(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { discordRequest } = require("../utils").utils;
    const args = inputs || {};
    const channelId = args.channel_id || "";
    const result = await discordRequest(opts, "DELETE", `/channels/${channelId}`);
    if (!result.ok) return result;
    return { ok: true, status: "success", message: "Canal supprimé" };
  }
};
