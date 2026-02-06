const { utils } = require("./utils");

module.exports = {
  async ms_teams_send_message(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.teamId) return { ok: false, error: "Missing teamId." };
    if (!d.channelId) return { ok: false, error: "Missing channelId." };
    if (!d.content) return { ok: false, error: "Missing content." };

    const body = {
      body: {
        contentType: d.contentType || "text",
        content: d.content
      }
    };

    const res = await utils.graphRequest(opts, `/teams/${d.teamId}/channels/${d.channelId}/messages`, {
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
      chatId: "",
      channelId: d.channelId
    };
  }
};
