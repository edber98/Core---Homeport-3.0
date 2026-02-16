const { utils } = require("./utils");

module.exports = {
  async stripe_charge_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.chargeId) return { ok: false, error: "Missing chargeId." };
    log('Récupération des données...');
    const res = await utils.stripeRequest(opts, `/charges/${d.chargeId}`);
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  }
};
