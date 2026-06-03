const { utils } = require("./utils");

module.exports = {
  async anthropic_batch_cancel(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const batchId = String(d.batchId || "").trim();
    if (!batchId) return { ok: false, error: "ID du batch requis." };

    log("Annulation du batch...");
    const res = await utils.anthropicRequest(opts, `/messages/batches/${encodeURIComponent(batchId)}/cancel`, {
      method: "POST"
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.mapBatch(res.data) };
  }
};
