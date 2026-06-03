const { utils } = require("./utils");

module.exports = {
  async se_ranking_domain_worldwide(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.domain) return { ok: false, error: "Domaine requis." };
    const res = await utils.seRankingRequest(opts, "GET", "/v1/domain/overview/worldwide", { query: { domain: d.domain, currency: d.currency || "USD", fields: d.fields || "price,traffic,keywords" } });
    if (!res.ok) return res;
    return { ok: true, ...utils.report(res.data) };
  }
};
