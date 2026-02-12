const { utils } = require("./utils");

module.exports = {
  async ms_teams_list_messages(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.teamId) return { ok: false, error: "Missing teamId." };
    if (!d.channelId) return { ok: false, error: "Missing channelId." };

    const top = d.top || 50;
    const res = await utils.graphRequest(opts, `/teams/${d.teamId}/channels/${d.channelId}/messages?$top=${top}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const messages = (res.data.value || []).map(m => ({
      id: m.id,
      content: m.body?.content,
      from: m.from?.user?.displayName || "",
      createdDateTime: m.createdDateTime
    }));
    const totalCount = res.data?.["@odata.count"] || messages.length;
    const hasMore = !!res.data?.["@odata.nextLink"];
    return { ok: true, messages, totalCount, hasMore };
  }
};
