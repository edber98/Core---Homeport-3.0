const { utils } = require("./utils");

module.exports = {
  async ahrefs_metrics(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.target) return { ok: false, error: "Cible requise." };
    const res = await utils.ahrefsRequest(opts, "siteExplorer", "/metrics", { target: d.target, mode: d.mode || "domain", date: d.date });
    if (!res.ok) return res;
    return { ok: true, target: d.target, metric: "metrics", value: "", raw: JSON.stringify(res.data || {}) };
  }
};
