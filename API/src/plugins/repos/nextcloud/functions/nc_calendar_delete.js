const { utils } = require("./utils");

module.exports = {
  async nc_calendar_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.calendarName) return { ok: false, error: "Identifiant du calendrier requis." };
    log('Suppression en cours...');
    const res = await utils.caldavRequest(opts, d.calendarName + "/", { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "deleted", message: `Calendrier supprimé: ${d.calendarName}` };
  }
};
