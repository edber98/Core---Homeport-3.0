const { utils } = require("./utils");

module.exports = {
  async nc_event_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.calendarName) return { ok: false, error: "Calendrier requis." };
    if (!d.eventId) return { ok: false, error: "ID événement requis." };
    log('Suppression en cours...');
    const res = await utils.caldavRequest(opts, `${d.calendarName}/${d.eventId}.ics`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "deleted", message: `Événement supprimé: ${d.eventId}` };
  }
};
