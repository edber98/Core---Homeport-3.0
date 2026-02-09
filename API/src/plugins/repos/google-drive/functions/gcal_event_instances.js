const { utils } = require("./utils");

module.exports = {
  async gcal_event_instances(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.calendarId || !d.eventId) return { ok: false, error: "Missing calendarId or eventId." };
    const params = new URLSearchParams();
    if (d.timeMin) params.set("timeMin", d.timeMin);
    if (d.timeMax) params.set("timeMax", d.timeMax);
    const qs = params.toString();
    const url = `${utils.CALENDAR_API}/calendars/${encodeURIComponent(d.calendarId)}/events/${encodeURIComponent(d.eventId)}/instances${qs ? "?" + qs : ""}`;
    const res = await utils.googleRequest(opts, url);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, events: res.data.items || [] };
  }
};
