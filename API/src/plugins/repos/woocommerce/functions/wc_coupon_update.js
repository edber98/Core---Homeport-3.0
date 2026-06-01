const { utils } = require("./utils");

module.exports = {
  async wc_coupon_update(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.couponId) return { ok: false, error: "Missing couponId." };
    const body = {};
    if (d.code) body.code = d.code;
    if (d.amount !== undefined && d.amount !== null && d.amount !== "") body.amount = String(d.amount);
    if (d.description) body.description = d.description;
    if (d.date_expires) body.date_expires = d.date_expires;
    const res = await utils.wcRequest(opts, `/coupons/${d.couponId}`, { method: "PUT", body });
    if (!res.ok) return res;
    const c = res.data || {};
    return { ok: true, id: String(c.id), code: c.code || "", amount: c.amount || "", date_expires: c.date_expires || "" };
  }
};
