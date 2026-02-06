const { utils } = require("./utils");

module.exports = {
  async pl_customer_invoices_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.per_page) query.per_page = d.per_page;
    if (d.page) query.page = d.page;
    if (d.status) query.filter = JSON.stringify([{ field: "status", operator: "eq", value: d.status }]);

    const res = await utils.plRequest(opts, "/customer_invoices", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.invoices) || [];
    const invoices = results.map(r => ({ id: String(r.id || ""), invoice_number: r.invoice_number || "", label: r.label || "", amount: String(r.amount || r.total || ""), status: r.status || "", date: r.date || "" }));
    return { ok: true, invoices };
  }
};
