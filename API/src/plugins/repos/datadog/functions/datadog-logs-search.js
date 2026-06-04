const { utils } = require("./utils");

module.exports = {
  async datadog_logs_search(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const body = {
      filter: utils.compact({
        query: d.logQuery || "*",
        from: d.from || "now-15m",
        to: d.to || "now",
        indexes: utils.splitCsv(d.indexes)
      }),
      page: utils.compact({ limit: utils.toNumber(d.limit) || 25, cursor: d.cursor })
    };
    log("Recherche dans les logs...");
    const res = await utils.datadogRequest(opts, "/api/v2/logs/events/search", { method: "POST", body });
    if (!res.ok) return res;
    const logs = Array.isArray(res.data?.data) ? res.data.data : [];
    return { ok: true, totalCount: logs.length, logs, nextCursor: res.data?.meta?.page?.after || null, raw: res.data };
  }
};
