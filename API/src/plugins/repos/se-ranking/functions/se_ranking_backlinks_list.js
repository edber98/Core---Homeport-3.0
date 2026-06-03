const { utils } = require("./utils");

module.exports = {
  async se_ranking_backlinks_list(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.target) return { ok: false, error: "Cible requise." };
    const res = await utils.seRankingRequest(opts, "GET", "/v1/backlinks/all", { query: { target: d.target, target_type: d.targetType || "domain", limit: d.limit || 100, offset: d.offset || 0 } });
    if (!res.ok) return res;
    return { ok: true, ...utils.report(res.data) };
  }
};
