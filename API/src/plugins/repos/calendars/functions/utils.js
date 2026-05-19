function mapCalendarEvent(data, fallback = {}) {
  const event = data && typeof data === "object" ? data : {};
  return {
    id: event.id || fallback.id || "",
    calendarId: fallback.calendarId || "",
    summary: event.summary || event.subject || fallback.summary || "",
    start: event.start?.dateTime || event.start?.date || fallback.start || "",
    end: event.end?.dateTime || event.end?.date || fallback.end || "",
    htmlLink: event.htmlLink || event.webLink || "",
    status: event.status || fallback.status || "ok",
    response: fallback.response || ""
  };
}

module.exports = { utils: { mapCalendarEvent } };
