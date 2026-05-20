const { utils } = require("./utils");

module.exports = {
  async se_ranking_domain_overview(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.domain) return { ok: false, error: "Domaine requis." };
    const res = await utils.seRankingRequest(opts, "GET", "/v1/domain/overview/db", { query: { domain: d.domain, database: d.database || "us", currency: d.currency || "USD" } });
    if (!res.ok) return res;
    return { ok: true, ...utils.report(res.data) };
  }
};
