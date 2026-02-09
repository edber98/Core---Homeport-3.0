const { utils } = require("./utils");

module.exports = {
  async gcal_update_event(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.calendarId || !d.eventId) return { ok: false, error: "Missing calendarId or eventId." };

    const body = {};
    if (d.summary) body.summary = d.summary;
    if (d.description) body.description = d.description;
    if (d.location) body.location = d.location;
    if (d.start_dateTime) body.start = { dateTime: d.start_dateTime };
    if (d.end_dateTime) body.end = { dateTime: d.end_dateTime };
    if (d.attendees) {
      body.attendees = d.attendees.split(",").map(e => ({ email: e.trim() })).filter(a => a.email);
    }

    const res = await utils.googleRequest(opts, `${utils.CALENDAR_API}/calendars/${encodeURIComponent(d.calendarId)}/events/${encodeURIComponent(d.eventId)}`, { method: "PUT", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...res.data };
  }
};
