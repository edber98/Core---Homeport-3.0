const { utils } = require("./utils");

module.exports = {
  async ps_cart_rules_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.limit) query["limit"] = d.limit;
    if (d.page && d.limit) query["limit"] = ((d.page - 1) * d.limit) + "," + d.limit;
    const res = await utils.psRequest(opts, "/cart_rules", { query });
    if (!res.ok) return res;
    const items = (res.data && res.data.cart_rules) || [];
    const cart_rules = items.map(r => ({ id: String(r.id), name: utils.psLangValue(r.name), code: r.code || "", reduction_percent: String(r.reduction_percent || ""), reduction_amount: String(r.reduction_amount || ""), active: String(r.active || "") }));
    return { ok: true, cart_rules };
  }
};
