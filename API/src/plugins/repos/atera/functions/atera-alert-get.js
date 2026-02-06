const { utils } = require("./utils");

module.exports = {
  async atera_alert_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.alertId) return { ok: false, error: "Missing alertId." };

    const res = await utils.ateraRequest(opts, `/alerts/${encodeURIComponent(d.alertId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...res.data };
  }
};
