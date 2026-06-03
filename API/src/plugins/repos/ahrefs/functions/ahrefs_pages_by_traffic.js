const { utils } = require("./utils");

module.exports = {
  async ahrefs_pages_by_traffic(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.target) return { ok: false, error: "Cible requise." };
    const res = await utils.ahrefsRequest(opts, "siteExplorer", "/pages-by-traffic", {
      target: d.target,
      mode: d.mode || "domain",
      country: d.country || "us",
      limit: d.limit || 50
    });
    if (!res.ok) return res;
    return { ok: true, ...utils.report(res.data) };
  }
};
