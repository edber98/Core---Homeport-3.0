const { utils } = require("./utils");

module.exports = {
  async nc_talk_send_message(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.token) return { ok: false, error: "Token requis." };
    if (!d.message) return { ok: false, error: "Message requis." };
    const body = { message: d.message };
    if (d.replyTo) body.replyTo = parseInt(d.replyTo, 10);
    log('Création en cours...');
    const res = await utils.ocsRequest(opts, `/ocs/v2.php/apps/spreed/api/v4/chat/${encodeURIComponent(d.token)}`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const m = (res.data && res.data.ocs && res.data.ocs.data) || {};
    return {
      ok: true,
      id: String(m.id || ""),
      token: m.token || d.token,
      actorId: m.actorId || "",
      actorDisplayName: m.actorDisplayName || "",
      message: m.message || "",
      timestamp: String(m.timestamp || "")
    };
  }
};
