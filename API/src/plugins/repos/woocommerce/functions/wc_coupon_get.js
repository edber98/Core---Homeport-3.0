const { utils } = require("./utils");

module.exports = {
  async wc_coupon_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.couponId) return { ok: false, error: "Missing couponId." };
    log('Récupération des données...');
    const res = await utils.wcRequest(opts, `/coupons/${d.couponId}`);
    if (!res.ok) return res;
    const c = res.data || {};
    return { ok: true, id: String(c.id), code: c.code || "", discount_type: c.discount_type || "", amount: c.amount || "", date_expires: c.date_expires || "" };
  }
};
