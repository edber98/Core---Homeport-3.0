const { utils } = require("./utils");

module.exports = {
  async qb_invoices_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = d.query || "SELECT * FROM Invoice";
    const res = await utils.qbQuery(opts, query, d.maxResults);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.QueryResponse && res.data.QueryResponse.Invoice) || [];
    const invoices = results.map(r => ({ id: String(r.Id || ""), docNumber: r.DocNumber || "", txnDate: r.TxnDate || "", totalAmt: String(r.TotalAmt != null ? r.TotalAmt : ""), balance: String(r.Balance != null ? r.Balance : "") }));
    return { ok: true, invoices };
  }
};
