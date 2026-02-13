const { utils } = require("./utils");

module.exports = {
  async wc_order_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.billing_email) return { ok: false, error: "Missing billing_email." };
    const body = { billing: { email: d.billing_email } };
    if (d.payment_method) body.payment_method = d.payment_method;
    if (d.status) body.status = d.status;
    if (d.line_items) { try { body.line_items = typeof d.line_items === "string" ? JSON.parse(d.line_items) : d.line_items; } catch {} }
    log('Création en cours...');
    const res = await utils.wcRequest(opts, "/orders", { method: "POST", body });
    if (!res.ok) return res;
    const o = res.data || {};
    return { ok: true, id: String(o.id), number: String(o.number || ""), status: o.status || "", total: o.total || "", currency: o.currency || "", billing_email: (o.billing && o.billing.email) || "", payment_method: o.payment_method || "", date_created: o.date_created || "" };
  }
};
