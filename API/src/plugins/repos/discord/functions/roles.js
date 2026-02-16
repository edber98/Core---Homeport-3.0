module.exports = {
  async discord_list_roles(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { discordRequest } = require("../utils").utils;
    const args = inputs || {};
    const guildId = args.guild_id || "";
    const result = await discordRequest(opts, "GET", `/guilds/${guildId}/roles`);
    return result;
  },

  async discord_create_role(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { discordRequest } = require("../utils").utils;
    const args = inputs || {};
    const guildId = args.guild_id || "";
    const body = {};
    if (args.name !== undefined && args.name !== null && args.name !== "") body.name = args.name;
    if (args.color !== undefined && args.color !== null && args.color !== "") body.color = Number(args.color);
    if (args.hoist !== undefined) body.hoist = !!args.hoist;
    if (args.mentionable !== undefined) body.mentionable = !!args.mentionable;
    const result = await discordRequest(opts, "POST", `/guilds/${guildId}/roles`, body);
    return result;
  },

  async discord_add_role_to_member(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { discordRequest } = require("../utils").utils;
    const args = inputs || {};
    const guildId = args.guild_id || "";
    const userId = args.user_id || "";
    const roleId = args.role_id || "";
    const result = await discordRequest(opts, "PUT", `/guilds/${guildId}/members/${userId}/roles/${roleId}`);
    return result;
  }
};
