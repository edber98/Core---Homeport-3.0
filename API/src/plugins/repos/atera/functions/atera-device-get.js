const { utils } = require("./utils");

module.exports = {
  async atera_device_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.deviceId) return { ok: false, error: "Missing deviceId." };

    log('Récupération des données...');
    const res = await utils.ateraRequest(opts, `/devices/genericdevice/${encodeURIComponent(d.deviceId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...res.data };
  }
};
