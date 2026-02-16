const { utils } = require("./utils");

module.exports = {
  async gcal_create_event(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const calendarId = d.calendarId || "primary";
    if (!d.summary) return { ok: false, error: "Missing summary." };
    if (!d.start_dateTime) return { ok: false, error: "Missing start_dateTime." };
    if (!d.end_dateTime) return { ok: false, error: "Missing end_dateTime." };

    const body = {
      summary: d.summary,
      start: { dateTime: d.start_dateTime },
      end: { dateTime: d.end_dateTime },
    };
    if (d.description) body.description = d.description;
    if (d.location) body.location = d.location;
    if (d.start_timeZone) body.start.timeZone = d.start_timeZone;
    if (d.end_timeZone) body.end.timeZone = d.end_timeZone;
    if (d.attendees) {
      body.attendees = d.attendees.split(",").map(e => ({ email: e.trim() })).filter(a => a.email);
    }
    if (d.recurrence) body.recurrence = [d.recurrence];
    if (d.reminders_minutes != null && d.reminders_minutes !== "") {
      body.reminders = { useDefault: false, overrides: [{ method: "popup", minutes: Number(d.reminders_minutes) }] };
    }

    log('Création en cours...');
    const res = await utils.googleRequest(opts, `${utils.CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...res.data };
  }
};
