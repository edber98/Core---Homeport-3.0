const { utils } = require("./utils");

module.exports = {
  async semrush_domain_overview(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.domain) return { ok: false, error: "Domaine requis." };
    const res = await utils.semrushRequest(opts, {
      type: "domain_ranks",
      domain: d.domain,
      database: utils.database(d),
      export_columns: d.columns || "Db,Dn,Rk,Or,Ot,Oc,Ad,At,Ac,Sh,Sv"
    });
    if (!res.ok) return res;
    return { ok: true, totalCount: String(res.rows.length), rows: res.rows, raw: res.text };
  }
};
