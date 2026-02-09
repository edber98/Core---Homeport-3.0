module.exports = {
  async discord_send_message(node, msg, inputs, opts) {
    const { discordRequest } = require("../utils").utils;
    const args = node.args || {};
    const body = {};
    if (args.content !== undefined && args.content !== null && args.content !== "") body.content = args.content;
    if (args.tts !== undefined) body.tts = !!args.tts;
    if (args.embed_json !== undefined && args.embed_json !== null && args.embed_json !== "") {
      try { body.embeds = JSON.parse(args.embed_json); } catch (e) { /* ignore */ }
    }
    const channelId = args.channel_id || "";
    const result = await discordRequest(opts, "POST", `/channels/${channelId}/messages`, body);
    return result;
  },

  async discord_get_message(node, msg, inputs, opts) {
    const { discordRequest } = require("../utils").utils;
    const args = node.args || {};
    const channelId = args.channel_id || "";
    const messageId = args.message_id || "";
    const result = await discordRequest(opts, "GET", `/channels/${channelId}/messages/${messageId}`);
    return result;
  },

  async discord_edit_message(node, msg, inputs, opts) {
    const { discordRequest } = require("../utils").utils;
    const args = node.args || {};
    const body = {};
    if (args.content !== undefined && args.content !== null && args.content !== "") body.content = args.content;
    if (args.embed_json !== undefined && args.embed_json !== null && args.embed_json !== "") {
      try { body.embeds = JSON.parse(args.embed_json); } catch (e) { /* ignore */ }
    }
    const channelId = args.channel_id || "";
    const messageId = args.message_id || "";
    const result = await discordRequest(opts, "PATCH", `/channels/${channelId}/messages/${messageId}`, body);
    return result;
  },

  async discord_delete_message(node, msg, inputs, opts) {
    const { discordRequest } = require("../utils").utils;
    const args = node.args || {};
    const channelId = args.channel_id || "";
    const messageId = args.message_id || "";
    const result = await discordRequest(opts, "DELETE", `/channels/${channelId}/messages/${messageId}`);
    return result;
  },

  async discord_list_messages(node, msg, inputs, opts) {
    const { discordRequest } = require("../utils").utils;
    const args = node.args || {};
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
    const { discordRequest } = require("../utils").utils;
    const args = node.args || {};
    const channelId = args.channel_id || "";
    const messageId = args.message_id || "";
    const emoji = encodeURIComponent(args.emoji || "");
    const result = await discordRequest(opts, "PUT", `/channels/${channelId}/messages/${messageId}/reactions/${emoji}/@me`);
    return result;
  }
};
