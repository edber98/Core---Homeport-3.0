const { utils } = require("./utils");

module.exports = {
  async ms_teams_add_member(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.teamId) return { ok: false, error: "Missing teamId." };
    if (!d.userId) return { ok: false, error: "Missing userId." };

    const body = {
      "@odata.type": "#microsoft.graph.aadUserConversationMember",
      "roles": d.roles ? [d.roles] : ["member"],
      "user@odata.bind": `https://graph.microsoft.com/v1.0/users('${d.userId}')`
    };

    const res = await utils.graphRequest(opts, `/teams/${d.teamId}/members`, {
      method: "POST",
      body
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const m = res.data;
    return {
      ok: true,
      id: m.id,
      displayName: m.displayName || "",
      email: m.email || "",
      roles: (m.roles || []).join(", ")
    };
  }
};
