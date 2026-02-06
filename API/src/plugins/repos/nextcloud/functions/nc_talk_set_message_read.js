const { utils } = require("./utils");

module.exports = {
  async nc_talk_set_message_read(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.token) return { ok: false, error: "Token requis." };
    const body = {};
    if (d.lastReadMessage) body.lastReadMessage = parseInt(d.lastReadMessage, 10);
    const res = await utils.ocsRequest(opts, `/ocs/v2.php/apps/spreed/api/v4/chat/${encodeURIComponent(d.token)}/read`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "read", message: "Messages marqués comme lus." };
  }
};
