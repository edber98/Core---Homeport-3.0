const { utils } = require("./utils");

module.exports = {
  async dolibarr_order_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.id) return { ok: false, error: "Champ id requis." };

    const res = await utils.dolibarrRequest(opts, `/orders/${encodeURIComponent(d.id)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...( typeof res.data === 'object' && res.data !== null ? res.data : { data: res.data }) };
  }
};
