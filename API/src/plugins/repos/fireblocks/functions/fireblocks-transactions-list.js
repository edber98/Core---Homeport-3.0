const { utils } = require("./utils");

module.exports = {
  async fireblocks_transactions_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    log("Lecture des transactions Fireblocks...");
    const res = await utils.fireblocksRequest(opts, "/transactions", {
      query: { limit: utils.toInt(d.pageSize, 50), before: d.before, after: d.after, status: d.status, assets: d.assets, sourceType: d.sourceType, destType: d.destType }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const transactions = (Array.isArray(res.data) ? res.data : []).map(utils.compactTransaction);
    return { ok: true, transactions, totalCount: transactions.length };
  }
};
