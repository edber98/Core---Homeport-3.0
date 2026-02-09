const { utils } = require("./utils");

module.exports = {
  async nc_talk_room_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.roomType) return { ok: false, error: "Type de conversation requis." };
    const body = { roomType: parseInt(d.roomType, 10) };
    if (d.invite) body.invite = d.invite;
    if (d.roomName) body.roomName = d.roomName;
    const res = await utils.ocsRequest(opts, "/ocs/v2.php/apps/spreed/api/v4/room", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const room = (res.data && res.data.ocs && res.data.ocs.data) || {};
    return {
      ok: true,
      token: room.token || "",
      name: room.displayName || room.name || "",
      type: String(room.type || ""),
      participantType: String(room.participantType || ""),
      lastMessage: (room.lastMessage && room.lastMessage.message) || "",
      unreadMessages: String(room.unreadMessages || "0")
    };
  }
};
