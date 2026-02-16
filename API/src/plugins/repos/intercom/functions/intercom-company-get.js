const { utils } = require("./utils");

module.exports = {
  async intercom_company_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!(d.companyId || "").trim()) return { ok: false, error: "Missing companyId." };

    log('Récupération des données...');
    const res = await utils.intercomRequest(opts, `/companies/${d.companyId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.id, name: r.name || "", companyId: r.company_id || "", plan: r.plan?.name || "", industry: r.industry || "", userCount: String(r.user_count || 0), createdAt: String(r.created_at || "") };
  }
};
