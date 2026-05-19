const { utils } = require("./utils");

module.exports = {
  async datadog_metrics_query(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!d.query) return { ok: false, error: "Requête métrique requise." };
    const now = Math.floor(Date.now() / 1000);
    log("Requête de métriques...");
    const res = await utils.datadogRequest(opts, "/api/v1/query", {
      query: {
        from: utils.toNumber(d.from) || now - 3600,
        to: utils.toNumber(d.to) || now,
        query: d.query
      }
    });
    if (!res.ok) return res;
    return { ok: true, status: res.data?.status, series: res.data?.series || [], raw: res.data };
  }
};
