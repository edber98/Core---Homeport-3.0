const { utils } = require("./utils");

module.exports = {
  async ms_teams_list_members(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.teamId) return { ok: false, error: "Missing teamId." };

    const res = await utils.graphRequest(opts, `/teams/${d.teamId}/members`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const members = (res.data.value || []).map(m => ({
      id: m.id,
      displayName: m.displayName,
      email: m.email || "",
      roles: (m.roles || []).join(", ")
    }));
    return { ok: true, members };
  }
};
