const { utils } = require("./utils");

module.exports = {
  async semrush_backlinks_overview(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.target) return { ok: false, error: "Cible requise." };
    const res = await utils.semrushRequest(opts, {
      type: "backlinks_overview",
      target: d.target,
      target_type: d.targetType || "root_domain",
      export_columns: d.columns || "ascore,total,domains_num,urls_num,ips_num"
    });
    if (!res.ok) return res;
    return { ok: true, totalCount: String(res.rows.length), rows: res.rows, raw: res.text };
  }
};
