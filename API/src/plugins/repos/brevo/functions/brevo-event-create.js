const { utils } = require("./utils");

module.exports = {
  async brevo_event_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.eventName) return { ok: false, error: "Missing eventName." };
    if (!d.email) return { ok: false, error: "Missing email." };

    let properties = {};
    if (d.properties) {
      try { properties = typeof d.properties === 'object' ? d.properties : JSON.parse(String(d.properties)); }
      catch { return { ok: false, error: "JSON invalide dans properties." }; }
    }

    const body = { eventName: d.eventName, email: d.email, properties };
    const res = await utils.brevoRequest(opts, "/events", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "success", message: `Event ${d.eventName} créé.` };
  }
};
