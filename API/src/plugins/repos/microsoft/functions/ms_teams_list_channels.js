const { utils } = require("./utils");

module.exports = {
  async ms_teams_list_channels(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.teamId) return { ok: false, error: "Missing teamId." };

    const res = await utils.graphRequest(opts, `/teams/${d.teamId}/channels`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const channels = (res.data.value || []).map(c => ({
      id: c.id,
      displayName: c.displayName,
      description: c.description || "",
      membershipType: c.membershipType || ""
    }));
    const totalCount = res.data?.["@odata.count"] || channels.length;
    const hasMore = !!res.data?.["@odata.nextLink"];
    return { ok: true, channels, totalCount, hasMore };
  }
};
