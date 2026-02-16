const crypto = require("crypto");
const { utils } = require("./utils");

module.exports = {
  async nc_event_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.calendarName) return { ok: false, error: "Calendrier requis." };
    if (!d.summary) return { ok: false, error: "Résumé requis." };
    if (!d.dtstart) return { ok: false, error: "Date de début requise." };
    if (!d.dtend) return { ok: false, error: "Date de fin requise." };

    const uid = crypto.randomUUID();
    const formatDt = (s) => s.replace(/[-:]/g, "").replace(/\.\d+/, "").replace("T", "T").substring(0, 15) + "Z";
    const dtstart = formatDt(d.dtstart);
    const dtend = formatDt(d.dtend);

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Homeport//Nextcloud Plugin//FR",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${d.summary}`,
      d.description ? `DESCRIPTION:${d.description}` : null,
      d.location ? `LOCATION:${d.location}` : null,
      "END:VEVENT",
      "END:VCALENDAR"
    ].filter(Boolean).join("\r\n");

    log('Création en cours...');
    const res = await utils.caldavRequest(opts, `${d.calendarName}/${uid}.ics`, {
      method: "PUT",
      body: ics,
      rawBody: true,
      headers: { "Content-Type": "text/calendar; charset=utf-8" }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return {
      ok: true,
      id: uid,
      summary: d.summary,
      dtstart: d.dtstart,
      dtend: d.dtend,
      description: d.description || "",
      location: d.location || "",
      status: "CONFIRMED"
    };
  }
};
