const { utils } = require("./utils");

module.exports = {
  async nc_talk_rooms_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération de la liste...');
    const res = await utils.ocsRequest(opts, "/ocs/v2.php/apps/spreed/api/v4/room");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const raw = (res.data && res.data.ocs && res.data.ocs.data) || [];
    const rooms = (Array.isArray(raw) ? raw : []).map(r => ({
      token: r.token || "",
      name: r.displayName || r.name || "",
      type: String(r.type || ""),
      participantType: String(r.participantType || ""),
      lastMessage: (r.lastMessage && r.lastMessage.message) || "",
      unreadMessages: String(r.unreadMessages || "0")
    }));
    const totalCount = parseInt(res.data?.ocs?.meta?.totalitems, 10) || rooms.length;
    return { ok: true, totalCount, rooms };
  }
};
