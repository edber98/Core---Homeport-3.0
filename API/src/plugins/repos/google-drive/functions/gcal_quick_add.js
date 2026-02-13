const { utils } = require("./utils");

module.exports = {
  async gcal_quick_add(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const calendarId = d.calendarId || "primary";
    if (!d.text) return { ok: false, error: "Missing text." };
    const params = new URLSearchParams({ text: d.text });
    log('Création en cours...');
    const res = await utils.googleRequest(opts, `${utils.CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/quickAdd?${params}`, { method: "POST" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...res.data };
  }
};
