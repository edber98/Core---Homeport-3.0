const { utils } = require("./utils");

module.exports = {
  async plaid_institutions_search(node, msg, inputs, opts) {
    const d = inputs || {};
    const body = { query: d.query || "", products: utils.list(d.products, ["transactions"]), country_codes: utils.list(d.countryCodes, ["US"]) };
    const res = await utils.plaidRequest(opts, "/institutions/search", body);
    if (!res.ok) return res;
    const institutions = ((res.data && res.data.institutions) || []).map((i) => ({ id: i.institution_id || "", name: i.name || "", products: (i.products || []).join(", "), countryCodes: (i.country_codes || []).join(", ") }));
    return { ok: true, totalCount: String(institutions.length), institutions };
  }
};
