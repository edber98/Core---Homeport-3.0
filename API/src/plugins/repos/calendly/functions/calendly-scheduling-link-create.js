const { utils } = require("./utils");

module.exports = {
  async calendly_scheduling_link_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!(d.owner || "").trim()) return { ok: false, error: "Missing owner URI." };

    const body = { max_event_count: parseInt(d.maxEventCount, 10) || 1, owner: d.owner, owner_type: d.ownerType || "EventType" };
    const res = await utils.calendlyRequest(opts, "/scheduling_links", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = (res.data && res.data.resource) || {};
    return { ok: true, bookingUrl: r.booking_url, owner: r.owner, ownerType: r.owner_type };
  }
};
