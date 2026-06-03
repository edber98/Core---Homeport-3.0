function flattenMessage(result) {
  if (!result.ok) return result;
  const author = result.author || {};
  return {
    ok: true,
    id: result.id,
    channel_id: result.channel_id,
    author_id: author.id || "",
    author_username: author.username || "",
    content: result.content || "",
    timestamp: result.timestamp || "",
    tts: !!result.tts
  };
}

const handlers = {
async discord_send_message(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { discordRequest } = require("../utils").utils;
    const args = inputs || {};
    const body = {};
    if (args.content !== undefined && args.content !== null && args.content !== "") body.content = args.content;
    if (args.tts !== undefined) body.tts = !!args.tts;
    if (args.embed_json !== undefined && args.embed_json !== null && args.embed_json !== "") {
      try { body.embeds = JSON.parse(args.embed_json); } catch (e) { /* ignore */ }
    }
    const channelId = args.channel_id || "";
    const result = await discordRequest(opts, "POST", `/channels/${channelId}/messages`, body);
    return flattenMessage(result);
  },

  async discord_get_message(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { discordRequest } = require("../utils").utils;
    const args = inputs || {};
    const channelId = args.channel_id || "";
    const messageId = args.message_id || "";
    const result = await discordRequest(opts, "GET", `/channels/${channelId}/messages/${messageId}`);
    return flattenMessage(result);
  },

  async discord_edit_message(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { discordRequest } = require("../utils").utils;
    const args = inputs || {};
    const body = {};
    if (args.content !== undefined && args.content !== null && args.content !== "") body.content = args.content;
    if (args.embed_json !== undefined && args.embed_json !== null && args.embed_json !== "") {
      try { body.embeds = JSON.parse(args.embed_json); } catch (e) { /* ignore */ }
    }
    const channelId = args.channel_id || "";
    const messageId = args.message_id || "";
    const result = await discordRequest(opts, "PATCH", `/channels/${channelId}/messages/${messageId}`, body);
    return flattenMessage(result);
  },

  async discord_delete_message(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { discordRequest } = require("../utils").utils;
    const args = inputs || {};
    const channelId = args.channel_id || "";
    const messageId = args.message_id || "";
    const result = await discordRequest(opts, "DELETE", `/channels/${channelId}/messages/${messageId}`);
    return result;
  },

  async discord_list_messages(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { discordRequest } = require("../utils").utils;
    const args = inputs || {};
    const channelId = args.channel_id || "";
    const params = [];
    if (args.limit !== undefined && args.limit !== null && args.limit !== "") params.push(`limit=${Number(args.limit)}`);
    if (args.before !== undefined && args.before !== null && args.before !== "") params.push(`before=${args.before}`);
    if (args.after !== undefined && args.after !== null && args.after !== "") params.push(`after=${args.after}`);
    const qs = params.length ? `?${params.join("&")}` : "";
    const result = await discordRequest(opts, "GET", `/channels/${channelId}/messages${qs}`);
    return result;
  },

  async discord_react_message(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { discordRequest } = require("../utils").utils;
    const args = inputs || {};
    const channelId = args.channel_id || "";
    const messageId = args.message_id || "";
    const emoji = encodeURIComponent(args.emoji || "");
    const result = await discordRequest(opts, "PUT", `/channels/${channelId}/messages/${messageId}/reactions/${emoji}/@me`);
    return result;
  },

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
  },

async discord_get_guild(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { discordRequest } = require("../utils").utils;
    const args = inputs || {};
    const guildId = args.guild_id || "";
    const result = await discordRequest(opts, "GET", `/guilds/${guildId}`);
    return result;
  },

  async discord_list_guild_channels(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { discordRequest } = require("../utils").utils;
    const args = inputs || {};
    const guildId = args.guild_id || "";
    const result = await discordRequest(opts, "GET", `/guilds/${guildId}/channels`);
    return result;
  },

  async discord_list_guild_members(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { discordRequest } = require("../utils").utils;
    const args = inputs || {};
    const guildId = args.guild_id || "";
    const params = [];
    if (args.limit !== undefined && args.limit !== null && args.limit !== "") params.push(`limit=${Number(args.limit)}`);
    if (args.after !== undefined && args.after !== null && args.after !== "") params.push(`after=${args.after}`);
    const qs = params.length ? `?${params.join("&")}` : "";
    const result = await discordRequest(opts, "GET", `/guilds/${guildId}/members${qs}`);
    return result;
  },

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
  },

async discord_create_thread(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { discordRequest } = require("../utils").utils;
    const args = inputs || {};
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
    const log = (opts && opts.log) ? opts.log : () => {};
    const { discordRequest } = require("../utils").utils;
    const args = inputs || {};
    const guildId = args.guild_id || "";
    const result = await discordRequest(opts, "GET", `/guilds/${guildId}/threads/active`);
    if (!result.ok) return result;
    return { ok: true, data: result.threads || [] };
  },

async discord_get_user(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { discordRequest } = require("../utils").utils;
    const args = inputs || {};
    const userId = args.user_id || "";
    const result = await discordRequest(opts, "GET", `/users/${userId}`);
    return result;
  },

  async discord_get_me(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const { discordRequest } = require("../utils").utils;
    const args = inputs || {};
    const result = await discordRequest(opts, "GET", `/users/@me`);
    return result;
  }
,
  async discord_remove_role_from_member(node, msg, inputs, opts) {
    const { discordRequest } = require("../utils").utils;
    const a = inputs || {};
    return await discordRequest(opts, "DELETE", `/guilds/${a.guild_id || ""}/members/${a.user_id || ""}/roles/${a.role_id || ""}`);
  },

  async discord_create_dm(node, msg, inputs, opts) {
    const { discordRequest } = require("../utils").utils;
    const a = inputs || {};
    return await discordRequest(opts, "POST", "/users/@me/channels", { recipient_id: a.user_id || "" });
  },

  async discord_bulk_delete_messages(node, msg, inputs, opts) {
    const { discordRequest } = require("../utils").utils;
    const a = inputs || {};
    let messages = a.message_ids;
    if (typeof messages === "string") { try { messages = JSON.parse(messages); } catch { messages = String(messages).split(',').map(v=>v.trim()).filter(Boolean); } }
    if (!Array.isArray(messages) || !messages.length) return { ok: false, error: "message_ids requis." };
    return await discordRequest(opts, "POST", `/channels/${a.channel_id || ""}/messages/bulk-delete`, { messages });
  },

  async discord_pin_message(node, msg, inputs, opts) {
    const { discordRequest } = require("../utils").utils;
    const a = inputs || {};
    return await discordRequest(opts, "PUT", `/channels/${a.channel_id || ""}/pins/${a.message_id || ""}`);
  },

  async discord_unpin_message(node, msg, inputs, opts) {
    const { discordRequest } = require("../utils").utils;
    const a = inputs || {};
    return await discordRequest(opts, "DELETE", `/channels/${a.channel_id || ""}/pins/${a.message_id || ""}`);
  },

  async discord_get_guild_member(node, msg, inputs, opts) {
    const { discordRequest } = require("../utils").utils;
    const a = inputs || {};
    return await discordRequest(opts, "GET", `/guilds/${a.guild_id || ""}/members/${a.user_id || ""}`);
  },

  async discord_modify_guild_member(node, msg, inputs, opts) {
    const { discordRequest } = require("../utils").utils;
    const a = inputs || {};
    const body = {};
    if (a.nick !== undefined && a.nick !== "") body.nick = a.nick;
    if (a.channel_id !== undefined && a.channel_id !== "") body.channel_id = a.channel_id;
    if (a.communication_disabled_until !== undefined && a.communication_disabled_until !== "") body.communication_disabled_until = a.communication_disabled_until;
    return await discordRequest(opts, "PATCH", `/guilds/${a.guild_id || ""}/members/${a.user_id || ""}`, body);
  }

};

module.exports = { utils: require("../utils").utils, handlers };
