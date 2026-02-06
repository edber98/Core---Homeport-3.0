const { utils } = require("./utils");

module.exports = {
  async gcal_delete_calendar(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.calendarId) return { ok: false, error: "Missing calendarId." };
    const res = await utils.googleRequest(opts, `${utils.CALENDAR_API}/calendars/${encodeURIComponent(d.calendarId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "deleted", message: `Calendar ${d.calendarId} deleted.` };
  }
};
