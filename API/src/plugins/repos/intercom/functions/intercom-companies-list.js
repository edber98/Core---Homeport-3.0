const { utils } = require("./utils");

module.exports = {
  async intercom_companies_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const query = {};
    if (d.perPage) query.per_page = d.perPage;
    if (d.page) query.page = d.page;

    log('Récupération de la liste...');
    const res = await utils.intercomRequest(opts, "/companies", { query });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = (res.data && res.data.data) || [];
    const companies = items.map(r => ({ id: r.id, name: r.name || "", companyId: r.company_id || "", plan: r.plan?.name || "", industry: r.industry || "", createdAt: String(r.created_at || "") }));
    return { ok: true, companies, totalCount: res.data?.total_count || companies.length, hasMore: !!res.data?.pages?.next };
  }
};
