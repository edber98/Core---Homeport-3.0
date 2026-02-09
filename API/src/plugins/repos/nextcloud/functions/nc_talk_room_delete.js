const { utils } = require("./utils");

module.exports = {
  async nc_talk_room_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.token) return { ok: false, error: "Token requis." };
    const res = await utils.ocsRequest(opts, `/ocs/v2.php/apps/spreed/api/v4/room/${encodeURIComponent(d.token)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "deleted", message: "Conversation supprimée." };
  }
};
