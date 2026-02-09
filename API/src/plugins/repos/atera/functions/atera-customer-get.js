const { utils } = require("./utils");

module.exports = {
  async atera_customer_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.customerId) return { ok: false, error: "Missing customerId." };

    const res = await utils.ateraRequest(opts, `/customers/${encodeURIComponent(d.customerId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...res.data };
  }
};
