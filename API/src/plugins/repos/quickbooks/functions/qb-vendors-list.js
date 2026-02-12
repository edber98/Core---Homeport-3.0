const { utils } = require("./utils");

module.exports = {
  async qb_vendors_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = d.query || "SELECT * FROM Vendor";
    const res = await utils.qbQuery(opts, query, d.maxResults);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.QueryResponse && res.data.QueryResponse.Vendor) || [];
    const vendors = results.map(r => ({ id: String(r.Id || ""), displayName: r.DisplayName || "", primaryEmailAddr: (r.PrimaryEmailAddr && r.PrimaryEmailAddr.Address) || "", balance: String(r.Balance != null ? r.Balance : "") }));
    return { ok: true, vendors, totalCount: res.data?.QueryResponse?.totalCount || vendors.length };
  }
};
