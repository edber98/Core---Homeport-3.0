const { utils } = require("./utils");

module.exports = {
  async clickup_spaces_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const teamId = (d.teamId || "").trim();
    if (!teamId) return { ok: false, error: "Missing teamId." };

    log('Récupération de la liste...');
    const res = await utils.clickupRequest(opts, `/team/${encodeURIComponent(teamId)}/space`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.spaces) || [];
    const spaces = results.map(r => ({ id: r.id || "", name: r.name || "", private: String(r.private || false) }));
    return { ok: true, spaces, totalCount: spaces.length };
  }
};
