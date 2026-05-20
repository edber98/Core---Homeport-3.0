const { utils } = require("./utils");

module.exports = {
  async fireblocks_transaction_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let body;
    try { body = utils.parseJsonInput(d.transaction, "Transaction"); } catch (e) { return { ok: false, error: e.message }; }
    if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "Transaction JSON requise." };
    log("Création de la transaction Fireblocks...");
    const res = await utils.fireblocksRequest(opts, "/transactions", { method: "POST", body, idempotencyKey: d.idempotencyKey });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.compactTransaction(res.data || {}) };
  }
};
