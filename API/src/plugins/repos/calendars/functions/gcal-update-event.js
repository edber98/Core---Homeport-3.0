const { utils } = require("./utils");

module.exports = {
  async gcal_update_event(node, msg, inputs, opts) {
    const d = inputs || {};
    return { ok: true, ...utils.mapCalendarEvent({}, {
      id: d.eventId || "",
      calendarId: d.calendarId || "primary",
      status: "updated"
    }) };
  }
};
