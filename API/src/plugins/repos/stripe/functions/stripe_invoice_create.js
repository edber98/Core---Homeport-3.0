const { utils } = require("./utils");

module.exports = {
  async stripe_invoice_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.customer) return { ok: false, error: "Missing customer." };
    const body = { customer: d.customer };
    if (d.description) body.description = d.description;
    if (d.auto_advance !== undefined && d.auto_advance !== null && d.auto_advance !== "") {
      body.auto_advance = String(d.auto_advance);
    }
    const res = await utils.stripeRequest(opts, "/invoices", { method: "POST", body });
    if (!res.ok) return res;
    return { ok: true, ...res.data };
  }
};
