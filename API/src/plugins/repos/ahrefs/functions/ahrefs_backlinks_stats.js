const { utils } = require("./utils");

module.exports = {
  async ahrefs_backlinks_stats(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.target) return { ok: false, error: "Cible requise." };
    const res = await utils.ahrefsRequest(opts, "siteExplorer", "/backlinks-stats", { target: d.target, mode: d.mode || "domain" });
    if (!res.ok) return res;
    const item = utils.first(res.data);
    return { ok: true, target: d.target, metric: "backlinks_stats", value: item.backlinks || item.refdomains || "", raw: JSON.stringify(res.data || {}) };
  }
};
