const { utils } = require("./utils");

module.exports = {
  async anthropic_batch_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const batchId = String(d.batchId || "").trim();
    if (!batchId) return { ok: false, error: "ID du batch requis." };

    log("Récupération du batch...");
    const res = await utils.anthropicRequest(opts, `/messages/batches/${encodeURIComponent(batchId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.mapBatch(res.data) };
  }
};
