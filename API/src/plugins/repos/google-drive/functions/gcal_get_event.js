const { utils } = require("./utils");

module.exports = {
  async gcal_get_event(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.calendarId || !d.eventId) return { ok: false, error: "Missing calendarId or eventId." };
    const res = await utils.googleRequest(opts, `${utils.CALENDAR_API}/calendars/${encodeURIComponent(d.calendarId)}/events/${encodeURIComponent(d.eventId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...res.data };
  }
};
