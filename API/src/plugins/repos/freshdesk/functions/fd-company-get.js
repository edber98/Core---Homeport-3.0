const { utils } = require("./utils");

module.exports = {
  async fd_company_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const companyId = parseInt(d.companyId, 10);
    if (isNaN(companyId)) return { ok: false, error: "Missing companyId." };

    const res = await utils.freshdeskRequest(opts, `/companies/${companyId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, id: String(r.id || ""), name: r.name || "", description: r.description || "", domains: (r.domains || []).join(", "), createdAt: r.created_at || "" };
  }
};
