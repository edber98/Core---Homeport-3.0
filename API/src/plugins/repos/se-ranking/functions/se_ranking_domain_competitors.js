const { utils } = require("./utils");

module.exports = {
  async se_ranking_domain_competitors(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.domain) return { ok: false, error: "Domaine requis." };
    const res = await utils.seRankingRequest(opts, "GET", "/v1/domain/competitors", { query: { domain: d.domain, database: d.database || "us", limit: d.limit || 100, offset: d.offset || 0 } });
    if (!res.ok) return res;
    return { ok: true, ...utils.report(res.data) };
  }
};
