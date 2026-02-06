const crypto = require("crypto");
const { utils } = require("./utils");

module.exports = {
  async nc_event_update(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.calendarName) return { ok: false, error: "Calendrier requis." };
    if (!d.eventId) return { ok: false, error: "ID événement requis." };

    // First, get existing event
    const existing = await utils.caldavRequest(opts, `${d.calendarName}/${d.eventId}.ics`, { method: "GET" });
    let oldEvent = {};
    if (existing.ok && typeof existing.data === "string") {
      oldEvent = utils.parseICalEvent(existing.data);
    }

    const summary = d.summary || oldEvent.summary || "Sans titre";
    const dtstart = d.dtstart || oldEvent.dtstart || "";
    const dtend = d.dtend || oldEvent.dtend || "";
    const description = d.description !== undefined ? d.description : (oldEvent.description || "");
    const location = d.location !== undefined ? d.location : (oldEvent.location || "");

    const formatDt = (s) => {
      if (!s) return "";
      if (s.includes("T") && s.length <= 16) return s.replace(/[-:]/g, "").substring(0, 15) + "Z";
      return s;
    };

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Homeport//Nextcloud Plugin//FR",
      "BEGIN:VEVENT",
      `UID:${d.eventId}`,
      dtstart ? `DTSTART:${formatDt(dtstart)}` : null,
      dtend ? `DTEND:${formatDt(dtend)}` : null,
      `SUMMARY:${summary}`,
      description ? `DESCRIPTION:${description}` : null,
      location ? `LOCATION:${location}` : null,
      "END:VEVENT",
      "END:VCALENDAR"
    ].filter(Boolean).join("\r\n");

    const res = await utils.caldavRequest(opts, `${d.calendarName}/${d.eventId}.ics`, {
      method: "PUT",
      body: ics,
      rawBody: true,
      headers: { "Content-Type": "text/calendar; charset=utf-8" }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return {
      ok: true,
      id: d.eventId,
      summary,
      dtstart: d.dtstart || oldEvent.dtstart || "",
      dtend: d.dtend || oldEvent.dtend || "",
      description,
      location,
      status: "CONFIRMED"
    };
  }
};
