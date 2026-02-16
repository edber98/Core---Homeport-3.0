const { utils } = require("./utils");

module.exports = {
  async qb_bills_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = d.query || "SELECT * FROM Bill";
    const res = await utils.qbQuery(opts, query, d.maxResults);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.QueryResponse && res.data.QueryResponse.Bill) || [];
    const bills = results.map(r => ({ id: String(r.Id || ""), docNumber: r.DocNumber || "", txnDate: r.TxnDate || "", totalAmt: String(r.TotalAmt != null ? r.TotalAmt : ""), balance: String(r.Balance != null ? r.Balance : "") }));
    return { ok: true, bills, totalCount: res.data?.QueryResponse?.totalCount || bills.length };
  }
};
