const { utils } = require("./utils");

module.exports = {
  async pl_estimate_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const customer_id = (d.customer_id || "").toString().trim();
    const label = (d.label || "").trim();
    if (!customer_id) return { ok: false, error: "Missing customer_id." };
    if (!label) return { ok: false, error: "Missing label." };

    const estimate = { customer_id, label };
    if (d.date) estimate.date = d.date;
    if (d.currency) estimate.currency = d.currency;

    const res = await utils.plRequest(opts, "/estimates", { method: "POST", body: { estimate } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.estimate) || res.data || {};
    return { ok: true, id: String(r.id || ""), estimate_number: r.estimate_number || "", label: r.label || "", amount: String(r.amount || r.total || ""), currency: r.currency || "", status: r.status || "", date: r.date || "", customer_id: String(r.customer_id || "") };
  }
};
