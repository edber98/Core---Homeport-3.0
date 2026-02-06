const { utils } = require("./utils");

module.exports = {
  async ms_teams_create_chat(node, msg, inputs, opts) {
    const d = inputs || {};

    const body = {
      chatType: d.chatType || "oneOnOne"
    };
    if (d.topic) body.topic = d.topic;

    if (d.members) {
      const userIds = d.members.split(",").map(u => u.trim()).filter(Boolean);
      body.members = userIds.map(userId => ({
        "@odata.type": "#microsoft.graph.aadUserConversationMember",
        "roles": ["owner"],
        "user@odata.bind": `https://graph.microsoft.com/v1.0/users('${userId}')`
      }));
    }

    const res = await utils.graphRequest(opts, "/chats", {
      method: "POST",
      body
    });
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
