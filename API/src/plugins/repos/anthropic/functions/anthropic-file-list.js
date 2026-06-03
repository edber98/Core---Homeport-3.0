const { utils } = require("./utils");

module.exports = {
  async anthropic_file_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {
      limit: parseInt(d.limit, 10) || 20,
      before_id: d.beforeId,
      after_id: d.afterId
    };

    log("Liste des fichiers...");
    const res = await utils.anthropicRequest(opts, "/files", {
      query,
      beta: "files-api-2025-04-14"
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const files = Array.isArray(res.data?.data) ? res.data.data.map(utils.mapFile) : [];
    return {
      ok: true,
      files,
      totalCount: files.length,
      firstId: res.data?.first_id || "",
      lastId: res.data?.last_id || "",
      hasMore: Boolean(res.data?.has_more)
    };
  }
};
