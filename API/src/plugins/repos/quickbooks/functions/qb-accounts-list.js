const { utils } = require("./utils");

module.exports = {
  async qb_accounts_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = d.query || "SELECT * FROM Account";
    const res = await utils.qbQuery(opts, query, d.maxResults);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.QueryResponse && res.data.QueryResponse.Account) || [];
    const accounts = results.map(r => ({ id: String(r.Id || ""), name: r.Name || "", accountType: r.AccountType || "", currentBalance: String(r.CurrentBalance != null ? r.CurrentBalance : "") }));
    return { ok: true, accounts, totalCount: res.data?.QueryResponse?.totalCount || accounts.length };
  }
};
