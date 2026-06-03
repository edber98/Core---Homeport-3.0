const { utils } = require("./utils");

module.exports = {
  async se_ranking_subscription_get(node, msg, inputs, opts) {
    const res = await utils.seRankingRequest(opts, "GET", "/v1/account/subscription");
    if (!res.ok) return res;
    return { ok: true, totalCount: "1", rows: [{ json: JSON.stringify(res.data || {}) }], raw: JSON.stringify(res.data || {}) };
  }
};
