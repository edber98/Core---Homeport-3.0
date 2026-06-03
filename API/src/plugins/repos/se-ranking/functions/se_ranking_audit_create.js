const { utils } = require("./utils");

module.exports = {
  async se_ranking_audit_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.url) return { ok: false, error: "URL requise." };
    const res = await utils.seRankingRequest(opts, "POST", "/v1/audit", { body: { url: d.url, title: d.title || d.url } });
    if (!res.ok) return res;
    return { ok: true, totalCount: "1", rows: [{ json: JSON.stringify(res.data || {}) }], raw: JSON.stringify(res.data || {}) };
  }
};
