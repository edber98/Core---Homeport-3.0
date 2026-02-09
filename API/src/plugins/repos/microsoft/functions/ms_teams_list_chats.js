const { utils } = require("./utils");

module.exports = {
  async ms_teams_list_chats(node, msg, inputs, opts) {
    const d = inputs || {};
    let path = "/me/chats";
    if (d.top) path += `?$top=${d.top}`;

    const res = await utils.graphRequest(opts, path);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const chats = (res.data.value || []).map(c => ({
      id: c.id,
      topic: c.topic || "",
      chatType: c.chatType || "",
      createdDateTime: c.createdDateTime || ""
    }));
    return { ok: true, chats };
  }
};
