const { utils } = require("./utils");

module.exports = {
  async nc_talk_messages_list(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.token) return { ok: false, error: "Token requis." };
    const params = new URLSearchParams();
    params.set("limit", String(d.limit || 100));
    params.set("lookIntoFuture", String(d.lookIntoFuture || "0"));
    const res = await utils.ocsRequest(opts, `/ocs/v2.php/apps/spreed/api/v4/chat/${encodeURIComponent(d.token)}?${params}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const raw = (res.data && res.data.ocs && res.data.ocs.data) || [];
    const messages = (Array.isArray(raw) ? raw : []).map(m => ({
      id: String(m.id || ""),
      token: m.token || d.token,
      actorId: m.actorId || "",
      actorDisplayName: m.actorDisplayName || "",
      message: m.message || "",
      timestamp: String(m.timestamp || "")
    }));
    return { ok: true, messages };
  }
};
