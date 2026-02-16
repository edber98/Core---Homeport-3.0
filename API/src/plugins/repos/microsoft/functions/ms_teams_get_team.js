const { utils } = require("./utils");

module.exports = {
  async ms_teams_get_team(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.teamId) return { ok: false, error: "Missing teamId." };

    log('Récupération des données...');
    const res = await utils.graphRequest(opts, `/teams/${d.teamId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const t = res.data;
    return {
      ok: true,
      id: t.id,
      displayName: t.displayName,
      description: t.description || ""
    };
  }
};
