const { utils } = require("./utils");

module.exports = {
  async semrush_keyword_related(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.keyword) return { ok: false, error: "Mot-clé requis." };
    const res = await utils.semrushRequest(opts, {
      type: "phrase_related",
      phrase: d.keyword,
      database: utils.database(d),
      display_limit: utils.limit(d),
      export_columns: d.columns || "Ph,Nq,Cp,Co,Nr,Td"
    });
    if (!res.ok) return res;
    return { ok: true, totalCount: String(res.rows.length), rows: res.rows, raw: res.text };
  }
};
