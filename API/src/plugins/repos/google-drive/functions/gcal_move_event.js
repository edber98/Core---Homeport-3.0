const { utils } = require("./utils");

module.exports = {
  async gcal_move_event(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.calendarId || !d.eventId || !d.destinationCalendarId) {
      return { ok: false, error: "Missing calendarId, eventId or destinationCalendarId." };
    }
    const params = new URLSearchParams({ destination: d.destinationCalendarId });
    log('Mise à jour en cours...');
    const res = await utils.googleRequest(opts, `${utils.CALENDAR_API}/calendars/${encodeURIComponent(d.calendarId)}/events/${encodeURIComponent(d.eventId)}/move?${params}`, { method: "POST" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...res.data };
  }
};
