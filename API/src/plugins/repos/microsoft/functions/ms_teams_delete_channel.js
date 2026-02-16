const { utils } = require("./utils");

module.exports = {
  async ms_teams_delete_channel(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.teamId) return { ok: false, error: "Missing teamId." };
    if (!d.channelId) return { ok: false, error: "Missing channelId." };

    log('Suppression en cours...');
    const res = await utils.graphRequest(opts, `/teams/${d.teamId}/channels/${d.channelId}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "deleted", message: `Canal ${d.channelId} supprimé.` };
  }
};
