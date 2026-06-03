const { utils } = require("./utils");

module.exports = {
  async anthropic_batch_results(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const batchId = String(d.batchId || "").trim();
    if (!batchId) return { ok: false, error: "ID du batch requis." };

    log("Récupération des résultats...");
    const res = await utils.anthropicRequest(opts, `/messages/batches/${encodeURIComponent(batchId)}/results`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const results = Array.isArray(res.data) ? res.data : utils.parseJsonLines(res.data);
    return {
      ok: true,
      results,
      totalCount: results.length,
      raw: typeof res.data === "string" ? res.data : JSON.stringify(res.data || [])
    };
  }
};
