const { utils } = require("./utils");

module.exports = {
  async se_ranking_keyword_related(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.keyword) return { ok: false, error: "Mot-clé requis." };
    const res = await utils.seRankingRequest(opts, "GET", "/v1/keywords/related", { query: { keyword: d.keyword, database: d.database || "us", limit: d.limit || 100, offset: d.offset || 0 } });
    if (!res.ok) return res;
    return { ok: true, ...utils.report(res.data) };
  }
};
