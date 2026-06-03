const { utils } = require("./utils");

module.exports = {
  async plaid_transactions_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.accessToken) return { ok: false, error: "Access token requis." };
    const body = { access_token: d.accessToken, start_date: d.startDate || "2026-01-01", end_date: d.endDate || "2026-01-31" };
    if (d.count || d.offset || d.accountIds) body.options = { count: Number(d.count || 100), offset: Number(d.offset || 0), account_ids: utils.list(d.accountIds, []) };
    const res = await utils.plaidRequest(opts, "/transactions/get", body);
    if (!res.ok) return res;
    const transactions = ((res.data && res.data.transactions) || []).map((t) => ({ id: t.transaction_id || "", accountId: t.account_id || "", name: t.name || t.merchant_name || "", amount: t.amount || 0, date: t.date || "", pending: String(!!t.pending) }));
    return { ok: true, totalCount: String((res.data && res.data.total_transactions) || transactions.length), transactions };
  }
};
