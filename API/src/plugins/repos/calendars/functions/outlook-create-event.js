const { utils } = require("./utils");

module.exports = {
  async outlook_create_event(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.subject) return { ok: false, error: "Sujet manquant." };
    if (!d.start || !d.end) return { ok: false, error: "Début et fin requis." };

    const event = {
      subject: String(d.subject),
      start: utils.toGraphDateTime(d.start),
      end: utils.toGraphDateTime(d.end),
    };
    if (d.body) event.body = { contentType: "HTML", content: String(d.body) };
    if (d.location) event.location = { displayName: String(d.location) };
    if (Array.isArray(d.attendees) && d.attendees.length) {
      event.attendees = d.attendees
        .map((a) => (typeof a === "string" ? a : a?.email || a?.address))
        .filter(Boolean)
        .map((address) => ({ emailAddress: { address: String(address) }, type: "required" }));
    }
    if (d.teamsMeeting) {
      event.isOnlineMeeting = true;
      event.onlineMeetingProvider = "teamsForBusiness";
    }

    log("Création de l’événement Outlook...");
    const res = await utils.graphRequest(opts, `${utils.calendarBase(d.calendarId)}/events`, {
      method: "POST",
      body: event,
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const ev = res.data || {};
    return {
      ok: true,
      ...utils.mapCalendarEvent(ev, { calendarId: d.calendarId || "primary", status: "created" }),
      joinUrl: ev.onlineMeeting?.joinUrl || "",
      webLink: ev.webLink || "",
    };
  }
};
