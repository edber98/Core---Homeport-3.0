const { utils } = require("./utils");

module.exports = {
  async ahrefs_broken_backlinks(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.target) return { ok: false, error: "Cible requise." };
    const res = await utils.ahrefsRequest(opts, "siteExplorer", "/broken-backlinks", {
      target: d.target,
      mode: d.mode || "domain",
      limit: d.limit || 50,
      order_by: d.orderBy
    });
    if (!res.ok) return res;
    return { ok: true, ...utils.report(res.data) };
  }
};
