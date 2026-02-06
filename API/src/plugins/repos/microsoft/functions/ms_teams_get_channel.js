const { utils } = require("./utils");

module.exports = {
  async ms_teams_get_channel(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.teamId) return { ok: false, error: "Missing teamId." };
    if (!d.channelId) return { ok: false, error: "Missing channelId." };

    const res = await utils.graphRequest(opts, `/teams/${d.teamId}/channels/${d.channelId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const c = res.data;
    return {
      ok: true,
      id: c.id,
      displayName: c.displayName,
      description: c.description || "",
      membershipType: c.membershipType || ""
    };
  }
};
