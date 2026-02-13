const { utils } = require("./utils");

module.exports = {
  async ms_teams_send_chat_message(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.chatId) return { ok: false, error: "Missing chatId." };
    if (!d.content) return { ok: false, error: "Missing content." };

    const body = {
      body: { contentType: "text", content: d.content }
    };

    log('Création en cours...');
    const res = await utils.graphRequest(opts, `/chats/${d.chatId}/messages`, {
      method: "POST",
      body
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const m = res.data;
    return {
      ok: true,
      id: m.id,
      content: m.body?.content,
      from: m.from?.user?.displayName || "",
      createdDateTime: m.createdDateTime,
      chatId: d.chatId,
      channelId: ""
    };
  }
};
