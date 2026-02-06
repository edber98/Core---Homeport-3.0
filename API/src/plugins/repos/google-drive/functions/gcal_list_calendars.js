const { utils } = require("./utils");

module.exports = {
  async gcal_list_calendars(node, msg, inputs, opts) {
    const res = await utils.googleRequest(opts, `${utils.CALENDAR_API}/users/me/calendarList`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, calendars: res.data.items || [] };
  }
};
