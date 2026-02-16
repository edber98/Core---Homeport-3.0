const { utils } = require("./utils");

module.exports = {
  async nc_talk_remove_participant(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.token) return { ok: false, error: "Token requis." };
    if (!d.participant) return { ok: false, error: "Participant requis." };
    log('Mise à jour en cours...');
    const res = await utils.ocsRequest(opts, `/ocs/v2.php/apps/spreed/api/v4/room/${encodeURIComponent(d.token)}/participants`, {
      method: "DELETE",
      body: { participant: d.participant }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "removed", message: `Participant retiré: ${d.participant}` };
  }
};
