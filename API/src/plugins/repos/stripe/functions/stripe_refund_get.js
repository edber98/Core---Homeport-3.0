const { utils } = require("./utils");

module.exports = {
  async stripe_refund_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.refundId) return { ok: false, error: "Missing refundId." };
    const res = await utils.stripeRequest(opts, `/refunds/${d.refundId}`);
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  }
};
