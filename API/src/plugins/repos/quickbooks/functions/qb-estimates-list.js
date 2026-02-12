const { utils } = require("./utils");

module.exports = {
  async qb_estimates_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = d.query || "SELECT * FROM Estimate";
    const res = await utils.qbQuery(opts, query, d.maxResults);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.QueryResponse && res.data.QueryResponse.Estimate) || [];
    const estimates = results.map(r => ({ id: String(r.Id || ""), docNumber: r.DocNumber || "", txnDate: r.TxnDate || "", totalAmt: String(r.TotalAmt != null ? r.TotalAmt : ""), txnStatus: r.TxnStatus || "" }));
    return { ok: true, estimates, totalCount: res.data?.QueryResponse?.totalCount || estimates.length };
  }
};
