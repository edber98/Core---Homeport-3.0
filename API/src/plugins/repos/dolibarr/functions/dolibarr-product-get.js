const { utils } = require("./utils");

module.exports = {
  async dolibarr_product_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.id) return { ok: false, error: "Champ id requis." };

    log('Récupération des données...');
    const res = await utils.dolibarrRequest(opts, `/products/${encodeURIComponent(d.id)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...( typeof res.data === 'object' && res.data !== null ? res.data : { data: res.data }) };
  }
};
