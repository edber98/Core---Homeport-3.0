module.exports = {
  async discord_webhook_event(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const data = msg || {};
    const user = data.d?.author || data.d?.user || data.d?.member?.user || {};
    return {
      ok: true,
      event_type: data.t || "",
      guild_id: data.d?.guild_id || "",
      channel_id: data.d?.channel_id || "",
      user_id: user.id || "",
      username: user.username || "",
      content: data.d?.content || "",
      message_id: data.d?.id || ""
    };
  }
};
