const { utils } = require("./utils");

module.exports = {
  async ps_cart_rule_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.cartRuleId) return { ok: false, error: "Missing cartRuleId." };
    const res = await utils.psRequest(opts, `/cart_rules/${d.cartRuleId}`);
    if (!res.ok) return res;
    const r = (res.data && res.data.cart_rule) || {};
    return { ok: true, id: String(r.id), name: utils.psLangValue(r.name), code: r.code || "", reduction_percent: String(r.reduction_percent || ""), reduction_amount: String(r.reduction_amount || ""), active: String(r.active || "") };
  }
};
