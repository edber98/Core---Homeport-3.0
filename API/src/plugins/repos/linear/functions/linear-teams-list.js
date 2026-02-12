const { utils } = require("./utils");

module.exports = {
  async linear_teams_list(node, msg, inputs, opts) {
    const query = `query { teams { nodes { id name key } } }`;

    const res = await utils.linearQuery(opts, query, {});
    if (!res.ok) return { ok: false, error: res.error };

    const nodes = (res.data && res.data.teams && res.data.teams.nodes) || [];
    const teams = nodes.map(t => ({ id: t.id || "", name: t.name || "", key: t.key || "" }));
    return { ok: true, teams, totalCount: String(teams.length) };
  }
};
