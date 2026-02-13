const { utils } = require("./utils");

module.exports = {
  async nc_event_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.calendarName) return { ok: false, error: "Calendrier requis." };
    if (!d.eventId) return { ok: false, error: "ID événement requis." };
    log('Récupération des données...');
    const res = await utils.caldavRequest(opts, `${d.calendarName}/${d.eventId}.ics`, { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const icsText = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
    const event = utils.parseICalEvent(icsText);
    return { ok: true, ...event, id: event.id || d.eventId };
  }
};
