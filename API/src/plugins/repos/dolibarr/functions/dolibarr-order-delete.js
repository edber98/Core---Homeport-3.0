const { utils } = require("./utils");

module.exports = {
  async dolibarr_order_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.id && d.id !== 0) return { ok: false, error: "Champ id requis." };
    log('Suppression en cours...');
    const res = await utils.dolibarrRequest(opts, `/orders/${encodeURIComponent(d.id)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...(typeof res.data === "object" && res.data !== null ? res.data : { id: res.data }) };
  }
};
