const { utils } = require("./utils");

module.exports = {
  async fireblocks_transaction_cancel(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const transactionId = String(d.transactionId || "").trim();
    if (!transactionId) return { ok: false, error: "ID transaction requis." };
    log("Annulation de la transaction Fireblocks...");
    const res = await utils.fireblocksRequest(opts, `/transactions/${encodeURIComponent(transactionId)}/cancel`, { method: "POST", body: {} });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: transactionId, success: true };
  }
};
