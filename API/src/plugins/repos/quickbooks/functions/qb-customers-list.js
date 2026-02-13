const { utils } = require("./utils");

module.exports = {
  async qb_customers_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = d.query || "SELECT * FROM Customer";
    const res = await utils.qbQuery(opts, query, d.maxResults);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.QueryResponse && res.data.QueryResponse.Customer) || [];
    const customers = results.map(r => ({ id: String(r.Id || ""), displayName: r.DisplayName || "", primaryEmailAddr: (r.PrimaryEmailAddr && r.PrimaryEmailAddr.Address) || "", balance: String(r.Balance != null ? r.Balance : ""), active: String(r.Active != null ? r.Active : "") }));
    return { ok: true, customers, totalCount: res.data?.QueryResponse?.totalCount || customers.length };
  }
};
