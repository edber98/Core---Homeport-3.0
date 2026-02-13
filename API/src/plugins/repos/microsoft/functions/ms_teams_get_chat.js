const { utils } = require("./utils");

module.exports = {
  async ms_teams_get_chat(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.chatId) return { ok: false, error: "Missing chatId." };

    log('Récupération des données...');
    const res = await utils.graphRequest(opts, `/chats/${d.chatId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const c = res.data;
    return {
      ok: true,
      id: c.id,
      topic: c.topic || "",
      chatType: c.chatType || "",
      createdDateTime: c.createdDateTime || ""
    };
  }
};
