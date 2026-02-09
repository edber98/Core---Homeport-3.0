const { utils } = require("./utils");

module.exports = {
  async wc_coupon_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.code) return { ok: false, error: "Missing code." };
    if (!d.amount) return { ok: false, error: "Missing amount." };
    const body = { code: d.code, amount: d.amount };
    if (d.discount_type) body.discount_type = d.discount_type;
    if (d.date_expires) body.date_expires = d.date_expires;
    const res = await utils.wcRequest(opts, "/coupons", { method: "POST", body });
    if (!res.ok) return res;
    const c = res.data || {};
    return { ok: true, id: String(c.id), code: c.code || "", discount_type: c.discount_type || "", amount: c.amount || "", date_expires: c.date_expires || "" };
  }
};
