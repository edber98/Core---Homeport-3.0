const { utils } = require("./utils");

module.exports = {
  async wc_coupon_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.couponId) return { ok: false, error: "Missing couponId." };
    const res = await utils.wcRequest(opts, `/coupons/${d.couponId}`, { method: "DELETE", query: { force: "true" } });
    if (!res.ok) return res;
    return { ok: true, status: "deleted", message: "Coupon " + d.couponId + " supprimé." };
  }
};
