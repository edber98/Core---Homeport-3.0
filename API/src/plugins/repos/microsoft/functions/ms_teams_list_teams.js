const { utils } = require("./utils");

module.exports = {
  async ms_teams_list_teams(node, msg, inputs, opts) {
    const res = await utils.graphRequest(opts, "/me/joinedTeams");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const teams = (res.data.value || []).map(t => ({
      id: t.id,
      displayName: t.displayName,
      description: t.description || ""
    }));
    return { ok: true, teams };
  }
};
