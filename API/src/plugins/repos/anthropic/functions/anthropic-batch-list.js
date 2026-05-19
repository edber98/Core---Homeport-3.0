const { utils } = require("./utils");

module.exports = {
  async anthropic_batch_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {
      limit: parseInt(d.limit, 10) || 20,
      before_id: d.beforeId,
      after_id: d.afterId
    };

    log("Liste des batches...");
    const res = await utils.anthropicRequest(opts, "/messages/batches", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const batches = Array.isArray(res.data?.data) ? res.data.data.map(utils.mapBatch) : [];
    return {
      ok: true,
      batches,
      totalCount: batches.length,
      firstId: res.data?.first_id || "",
      lastId: res.data?.last_id || "",
      hasMore: Boolean(res.data?.has_more)
    };
  }
};
