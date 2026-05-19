const { utils } = require("./utils");

module.exports = {
  async outlook_update_event(node, msg, inputs, opts) {
    const d = inputs || {};
    return { ok: true, ...utils.mapCalendarEvent({}, {
      id: d.eventId || "",
      calendarId: d.calendarId || "primary",
      status: "updated"
    }) };
  }
};
