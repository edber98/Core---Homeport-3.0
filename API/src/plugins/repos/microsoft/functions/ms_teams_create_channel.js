const { utils } = require("./utils");

module.exports = {
  async ms_teams_create_channel(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.teamId) return { ok: false, error: "Missing teamId." };
    if (!d.displayName) return { ok: false, error: "Missing displayName." };

    const body = { displayName: d.displayName };
    if (d.description) body.description = d.description;
    if (d.membershipType) body.membershipType = d.membershipType;

    log('Création en cours...');
    const res = await utils.graphRequest(opts, `/teams/${d.teamId}/channels`, {
      method: "POST",
      body
    });
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
