const { utils } = require("./utils");

module.exports = {
  async semrush_backlinks_list(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.target) return { ok: false, error: "Cible requise." };
    const res = await utils.semrushRequest(opts, {
      type: "backlinks",
      target: d.target,
      target_type: d.targetType || "root_domain",
      display_limit: utils.limit(d),
      export_columns: d.columns || "source_url,target_url,anchor,external_num,internal_num,type,first_seen,last_seen"
    });
    if (!res.ok) return res;
    return { ok: true, totalCount: String(res.rows.length), rows: res.rows, raw: res.text };
  }
};
