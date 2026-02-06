const { utils } = require("./utils");

module.exports = {
  async pl_supplier_invoice_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const supplier_id = (d.supplier_id || "").toString().trim();
    const label = (d.label || "").trim();
    if (!supplier_id) return { ok: false, error: "Missing supplier_id." };
    if (!label) return { ok: false, error: "Missing label." };

    const invoice = { supplier_id, label };
    if (d.date) invoice.date = d.date;
    if (d.deadline) invoice.deadline = d.deadline;
    if (d.currency) invoice.currency = d.currency;

    const res = await utils.plRequest(opts, "/supplier_invoices", { method: "POST", body: { invoice } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.invoice) || res.data || {};
    return { ok: true, id: String(r.id || ""), invoice_number: r.invoice_number || "", label: r.label || "", amount: String(r.amount || r.total || ""), currency: r.currency || "", status: r.status || "", date: r.date || "", deadline: r.deadline || "", customer_id: String(r.supplier_id || "") };
  }
};
