const { utils } = require("./utils");

module.exports = {
  async linear_team_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const teamId = (d.teamId || "").trim();
    if (!teamId) return { ok: false, error: "Missing teamId." };

    const query = `query Team($id: String!) {
      team(id: $id) { id name key description }
    }`;

    const res = await utils.linearQuery(opts, query, { id: teamId });
    if (!res.ok) return { ok: false, error: res.error };

    const t = (res.data && res.data.team) || {};
    return { ok: true, id: t.id || "", name: t.name || "", key: t.key || "", description: t.description || "" };
  }
};
