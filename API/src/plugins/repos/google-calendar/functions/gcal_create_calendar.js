const { utils } = require("./utils");

module.exports = {
  async gcal_create_calendar(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.summary) return { ok: false, error: "Missing summary." };
    const body = { summary: d.summary };
    if (d.description) body.description = d.description;
    if (d.timeZone) body.timeZone = d.timeZone;
    log('Création en cours...');
    const res = await utils.googleRequest(opts, `${utils.CALENDAR_API}/calendars`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...res.data };
  }
};
