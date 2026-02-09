const { utils } = require("./utils");

module.exports = {
  async nc_talk_add_participant(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.token) return { ok: false, error: "Token requis." };
    if (!d.newParticipant) return { ok: false, error: "Participant requis." };
    const body = { newParticipant: d.newParticipant, source: d.source || "users" };
    const res = await utils.ocsRequest(opts, `/ocs/v2.php/apps/spreed/api/v4/room/${encodeURIComponent(d.token)}/participants`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "added", message: `Participant ajouté: ${d.newParticipant}` };
  }
};
