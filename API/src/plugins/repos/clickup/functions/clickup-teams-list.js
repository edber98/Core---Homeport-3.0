const { utils } = require("./utils");

module.exports = {
  async clickup_teams_list(node, msg, inputs, opts) {
    const res = await utils.clickupRequest(opts, "/team");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.teams) || [];
    const teams = results.map(r => ({ id: r.id || "", name: r.name || "", color: r.color || "" }));
    return { ok: true, teams };
  }
};
