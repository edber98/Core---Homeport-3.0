const { utils } = require("./utils");

module.exports = {
  async atera_alert_close(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.alertId) return { ok: false, error: "Missing alertId." };

    log('Appel API en cours...');
    const res = await utils.ateraRequest(opts, `/alerts/${encodeURIComponent(d.alertId)}`, { method: "PUT" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true };
  }
};
