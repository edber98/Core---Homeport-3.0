const { utils } = require("./utils");

module.exports = {
  async gcal_list_calendars(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération de la liste...');
    const res = await utils.googleRequest(opts, `${utils.CALENDAR_API}/users/me/calendarList`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const calendars = res.data.items || [];
    return { ok: true, calendars, totalCount: calendars.length };
  }
};
