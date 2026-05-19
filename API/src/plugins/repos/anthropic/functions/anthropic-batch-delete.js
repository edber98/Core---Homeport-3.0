module.exports = {
  async anthropic_batch_delete(node, msg, inputs, opts) {
    const { utils } = require("./utils");
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const batchId = String(d.batchId || "").trim();
    if (!batchId) return { ok: false, error: "ID du batch requis." };

    log("Suppression du batch...");
    const res = await utils.anthropicRequest(opts, `/messages/batches/${encodeURIComponent(batchId)}`, {
      method: "DELETE"
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: res.data?.id || batchId, type: res.data?.type || "message_batch_deleted" };
  }
};
