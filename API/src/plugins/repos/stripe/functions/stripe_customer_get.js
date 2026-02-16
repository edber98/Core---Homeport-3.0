const { utils } = require("./utils");

module.exports = {
  async stripe_customer_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.customerId) return { ok: false, error: "Missing customerId." };
    log('Récupération des données...');
    const res = await utils.stripeRequest(opts, `/customers/${d.customerId}`);
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  }
};
