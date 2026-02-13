const { utils } = require("./utils");

module.exports = {
  async gcal_list_events(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const calendarId = d.calendarId || "primary";
    const params = new URLSearchParams();
    if (d.timeMin) params.set("timeMin", d.timeMin);
    if (d.timeMax) params.set("timeMax", d.timeMax);
    if (d.maxResults) params.set("maxResults", String(d.maxResults));
    if (d.q) params.set("q", d.q);
    if (d.singleEvents !== undefined && d.singleEvents !== null) {
      params.set("singleEvents", String(!!d.singleEvents));
    } else {
      params.set("singleEvents", "true");
    }
    if (d.orderBy) params.set("orderBy", d.orderBy);
    const qs = params.toString();
    const url = `${utils.CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events${qs ? "?" + qs : ""}`;
    log('Récupération de la liste...');
    const res = await utils.googleRequest(opts, url);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, events: res.data.items || [] };
  }
};
