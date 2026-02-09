const { utils } = require("./utils");

module.exports = {
  async calendly_event_cancel(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!(d.eventUuid || "").trim()) return { ok: false, error: "Missing eventUuid." };

    const body = {};
    if (d.reason) body.reason = d.reason;
    const res = await utils.calendlyRequest(opts, `/scheduled_events/${d.eventUuid}/cancellation`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "canceled", message: "Événement annulé." };
  }
};
