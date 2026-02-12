const { utils } = require("./utils");

module.exports = {
  async qb_payments_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = d.query || "SELECT * FROM Payment";
    const res = await utils.qbQuery(opts, query, d.maxResults);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.QueryResponse && res.data.QueryResponse.Payment) || [];
    const payments = results.map(r => ({ id: String(r.Id || ""), txnDate: r.TxnDate || "", totalAmt: String(r.TotalAmt != null ? r.TotalAmt : ""), customerRef: (r.CustomerRef && String(r.CustomerRef.value)) || "" }));
    return { ok: true, payments, totalCount: res.data?.QueryResponse?.totalCount || payments.length };
  }
};
