const { utils } = require("./utils");

module.exports = {
  async pl_suppliers_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.per_page) query.per_page = d.per_page;
    if (d.page) query.page = d.page;

    const res = await utils.plRequest(opts, "/suppliers", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.suppliers) || [];
    const suppliers = results.map(r => ({ id: String(r.source_id || r.id || ""), name: r.name || "", email: (r.emails && r.emails[0] && r.emails[0].email) || "", phone: r.phone || "", country: r.country_alpha2 || "" }));
    return { ok: true, suppliers };
  }
};
