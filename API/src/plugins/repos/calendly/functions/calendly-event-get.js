const { utils } = require("./utils");

module.exports = {
  async calendly_event_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!(d.eventUuid || "").trim()) return { ok: false, error: "Missing eventUuid." };

    const res = await utils.calendlyRequest(opts, `/scheduled_events/${d.eventUuid}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = (res.data && res.data.resource) || {};
    return { ok: true, uri: r.uri, name: r.name, status: r.status, startTime: r.start_time, endTime: r.end_time, eventType: r.event_type, createdAt: r.created_at };
  }
};
