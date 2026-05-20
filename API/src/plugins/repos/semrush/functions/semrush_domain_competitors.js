const { utils } = require("./utils");

module.exports = {
  async semrush_domain_competitors(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.domain) return { ok: false, error: "Domaine requis." };
    const res = await utils.semrushRequest(opts, {
      type: d.paid ? "domain_adwords_adwords" : "domain_organic_organic",
      domain: d.domain,
      database: utils.database(d),
      display_limit: utils.limit(d),
      export_columns: d.columns || "Dn,Cr,Np,Or,Ot,Oc,Ad,At,Ac"
    });
    if (!res.ok) return res;
    return { ok: true, totalCount: String(res.rows.length), rows: res.rows, raw: res.text };
  }
};
