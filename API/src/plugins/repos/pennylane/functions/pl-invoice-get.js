const { utils } = require("./utils");

module.exports = {
  async pl_invoice_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const invoiceId = (d.invoiceId || "").toString().trim();
    if (!invoiceId) return { ok: false, error: "Missing invoiceId." };

    const res = await utils.plRequest(opts, `/customer_invoices/${encodeURIComponent(invoiceId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = (res.data && res.data.invoice) || res.data || {};
    return { ok: true, id: String(r.id || ""), invoice_number: r.invoice_number || "", label: r.label || "", amount: String(r.amount || r.total || ""), currency: r.currency || "", status: r.status || "", date: r.date || "", deadline: r.deadline || "", customer_id: String(r.customer_id || "") };
  }
};
