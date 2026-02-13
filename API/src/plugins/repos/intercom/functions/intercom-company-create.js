const { utils } = require("./utils");

module.exports = {
  async intercom_company_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    if (!(d.companyId || "").trim()) return { ok: false, error: "Missing companyId." };
    if (!(d.name || "").trim()) return { ok: false, error: "Missing name." };

    const body = { company_id: d.companyId, name: d.name };
    if (d.plan) body.plan = d.plan;
    if (d.industry) body.industry = d.industry;

    log('Création en cours...');
    const res = await utils.intercomRequest(opts, "/companies", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.id, name: r.name || "", companyId: r.company_id || "", plan: r.plan?.name || "", industry: r.industry || "", userCount: String(r.user_count || 0), createdAt: String(r.created_at || "") };
  }
};
