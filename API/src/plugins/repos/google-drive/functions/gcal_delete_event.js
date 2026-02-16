const { utils } = require("./utils");

module.exports = {
  async gcal_delete_event(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.calendarId || !d.eventId) return { ok: false, error: "Missing calendarId or eventId." };
    log('Suppression en cours...');
    const res = await utils.googleRequest(opts, `${utils.CALENDAR_API}/calendars/${encodeURIComponent(d.calendarId)}/events/${encodeURIComponent(d.eventId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "deleted", message: `Event ${d.eventId} deleted.` };
  }
};
