const { utils } = require("./utils");

module.exports = {
  async fireblocks_transaction_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const transactionId = String(d.transactionId || "").trim();
    if (!transactionId) return { ok: false, error: "ID transaction requis." };
    const res = await utils.fireblocksRequest(opts, `/transactions/${encodeURIComponent(transactionId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.compactTransaction(res.data || {}) };
  }
};
