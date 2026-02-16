const { utils } = require("./utils");

module.exports = {
  async ps_cart_rule_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.name) return { ok: false, error: "Missing name." };
    if (!d.code) return { ok: false, error: "Missing code." };
    const cart_rule = { name: [{ id: 1, value: d.name }], code: d.code };
    if (d.reduction_percent) cart_rule.reduction_percent = d.reduction_percent;
    if (d.reduction_amount) cart_rule.reduction_amount = d.reduction_amount;
    if (d.active !== undefined) cart_rule.active = d.active;
    const body = { cart_rule };
    log('Création en cours...');
    const res = await utils.psRequest(opts, "/cart_rules", { method: "POST", body });
    if (!res.ok) return res;
    const r = (res.data && res.data.cart_rule) || {};
    return { ok: true, id: String(r.id), name: utils.psLangValue(r.name), code: r.code || "", reduction_percent: String(r.reduction_percent || ""), reduction_amount: String(r.reduction_amount || ""), active: String(r.active || "") };
  }
};
