const { utils } = require("./utils");

module.exports = {
  async semrush_domain_organic_keywords(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.domain) return { ok: false, error: "Domaine requis." };
    const res = await utils.semrushRequest(opts, {
      type: "domain_organic",
      domain: d.domain,
      database: utils.database(d),
      display_limit: utils.limit(d),
      display_sort: d.sort || "tr_desc",
      export_columns: d.columns || "Ph,Po,Pp,Pd,Nq,Cp,Ur,Tr,Tc,Co,Nr,Td"
    });
    if (!res.ok) return res;
    return { ok: true, totalCount: String(res.rows.length), rows: res.rows, raw: res.text };
  }
};
