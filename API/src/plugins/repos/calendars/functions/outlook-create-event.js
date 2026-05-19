const { utils } = require("./utils");

module.exports = {
  async outlook_create_event(node, msg, inputs, opts) {
    const d = inputs || {};
    return { ok: true, ...utils.mapCalendarEvent({}, {
      id: d.eventId || "",
      calendarId: d.calendarId || "primary",
      summary: d.subject || "",
      start: d.start || "",
      end: d.end || "",
      status: "created"
    }) };
  }
};
