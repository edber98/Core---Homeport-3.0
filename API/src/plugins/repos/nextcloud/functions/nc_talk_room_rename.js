const { utils } = require("./utils");

module.exports = {
  async nc_talk_room_rename(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.token) return { ok: false, error: "Token requis." };
    if (!d.roomName) return { ok: false, error: "Nom requis." };
    const res = await utils.ocsRequest(opts, `/ocs/v2.php/apps/spreed/api/v4/room/${encodeURIComponent(d.token)}`, {
      method: "PUT",
      body: { roomName: d.roomName }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "renamed", message: `Conversation renommée: ${d.roomName}` };
  }
};
