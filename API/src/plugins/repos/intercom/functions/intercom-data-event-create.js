const { utils } = require("./utils");

module.exports = {
  async intercom_data_event_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!(d.eventName || "").trim()) return { ok: false, error: "Missing eventName." };
    if (!(d.email || "").trim()) return { ok: false, error: "Missing email." };

    const body = { event_name: d.eventName, email: d.email, created_at: Math.floor(Date.now() / 1000) };
    if (d.metadata) {
      try { body.metadata = JSON.parse(d.metadata); } catch { body.metadata = {}; }
    }
    const res = await utils.intercomRequest(opts, "/events", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "created", message: "Événement créé." };
  }
};
