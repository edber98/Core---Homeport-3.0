const { utils } = require("./utils");

module.exports = {
  async plaid_transactions_sync(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.accessToken) return { ok: false, error: "Access token requis." };
    const body = { access_token: d.accessToken };
    if (d.cursor) body.cursor = d.cursor;
    if (d.count) body.count = Number(d.count);
    const res = await utils.plaidRequest(opts, "/transactions/sync", body);
    if (!res.ok) return res;
    const data = res.data || {};
    const added = (data.added || []).map((t) => ({ id: t.transaction_id || "", accountId: t.account_id || "", name: t.name || t.merchant_name || "", amount: t.amount || 0, date: t.date || "", pending: String(!!t.pending) }));
    const modified = (data.modified || []).map((t) => ({ id: t.transaction_id || "", accountId: t.account_id || "", name: t.name || t.merchant_name || "", amount: t.amount || 0, date: t.date || "", pending: String(!!t.pending) }));
    const removed = (data.removed || []).map((t) => ({ id: t.transaction_id || "", accountId: t.account_id || "" }));
    return { ok: true, addedCount: String(added.length), modifiedCount: String(modified.length), removedCount: String(removed.length), nextCursor: data.next_cursor || "", hasMore: String(!!data.has_more), added, modified, removed };
  }
};
