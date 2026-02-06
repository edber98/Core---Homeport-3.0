const { utils } = require("./utils");

module.exports = {
  async atera_device_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.deviceId) return { ok: false, error: "Missing deviceId." };

    const res = await utils.ateraRequest(opts, `/devices/genericdevice/${encodeURIComponent(d.deviceId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...res.data };
  }
};
