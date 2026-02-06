const { utils } = require("./utils");

module.exports = {
  async zd_organizations_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    if (d.page) query.page = parseInt(d.page, 10);
    if (d.perPage) query.per_page = parseInt(d.perPage, 10);

    const res = await utils.zendeskRequest(opts, "/organizations.json", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const results = (res.data && res.data.organizations) || [];
    const organizations = results.map(r => ({ id: String(r.id || ""), name: r.name || "", domainNames: (r.domain_names || []).join(", "), createdAt: r.created_at || "" }));
    return { ok: true, organizations };
  }
};
