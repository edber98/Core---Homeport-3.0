const { utils } = require("./utils");

module.exports = {
  async intercom_company_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const companyId = String(d.companyId || "").trim();
    if (!companyId) return { ok: false, error: "Missing companyId." };

    const body = {};
    if (d.name) body.name = d.name;
    if (d.plan) body.plan = d.plan;
    if (d.industry) body.industry = d.industry;
    if (d.monthlySpend !== undefined && d.monthlySpend !== null && d.monthlySpend !== "") body.monthly_spend = Number(d.monthlySpend);
    if (!Object.keys(body).length) return { ok: false, error: "Aucun champ à mettre à jour." };

    const res = await utils.intercomRequest(opts, `/companies/${encodeURIComponent(companyId)}`, { method: "PUT", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.id, name: r.name || "", companyId: r.company_id || "", plan: r.plan?.name || "", industry: r.industry || "", userCount: String(r.user_count || 0), createdAt: String(r.created_at || "") };
  }
};
