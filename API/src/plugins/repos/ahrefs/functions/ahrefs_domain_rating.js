const { utils } = require("./utils");

module.exports = {
  async ahrefs_domain_rating(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.target) return { ok: false, error: "Cible requise." };
    const res = await utils.ahrefsRequest(opts, "siteExplorer", "/domain-rating", { target: d.target, mode: d.mode || "domain" });
    if (!res.ok) return res;
    const item = utils.first(res.data);
    return { ok: true, target: d.target, metric: "domain_rating", value: item.domain_rating || item.domainRating || item.value || "", raw: JSON.stringify(res.data || {}) };
  }
};
