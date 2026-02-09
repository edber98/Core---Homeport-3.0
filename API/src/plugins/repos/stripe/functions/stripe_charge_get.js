const { utils } = require("./utils");

module.exports = {
  async stripe_charge_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.chargeId) return { ok: false, error: "Missing chargeId." };
    const res = await utils.stripeRequest(opts, `/charges/${d.chargeId}`);
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  }
};
