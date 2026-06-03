const { utils } = require("./utils");

module.exports = {
  async ahrefs_keyword_overview(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.keyword) return { ok: false, error: "Mot-clé requis." };
    const res = await utils.ahrefsRequest(opts, "keywordsExplorer", "/overview", { keyword: d.keyword, country: d.country || "us" });
    if (!res.ok) return res;
    return { ok: true, ...utils.report(res.data) };
  }
};
