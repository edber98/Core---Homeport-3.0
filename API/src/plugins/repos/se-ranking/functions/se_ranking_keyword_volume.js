const { utils } = require("./utils");

module.exports = {
  async se_ranking_keyword_volume(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.keywords) return { ok: false, error: "Mots-clés requis." };
    const keywords = String(d.keywords).split(",").map((item) => item.trim()).filter(Boolean);
    const res = await utils.seRankingRequest(opts, "POST", "/v1/keywords/volume", { body: { keywords, database: d.database || "us" } });
    if (!res.ok) return res;
    return { ok: true, ...utils.report(res.data) };
  }
};
