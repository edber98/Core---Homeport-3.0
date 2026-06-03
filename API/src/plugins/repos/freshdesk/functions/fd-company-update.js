const { utils } = require("./utils");

module.exports = {
  async fd_company_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const companyId = parseInt(d.companyId, 10);
    if (!Number.isFinite(companyId) || companyId <= 0) return { ok: false, error: "Missing or invalid companyId." };

    const body = {};
    if (d.name) body.name = String(d.name);
    if (d.description) body.description = String(d.description);
    if (d.note) body.note = String(d.note);
    if (d.domains) body.domains = String(d.domains).split(",").map((s) => s.trim()).filter(Boolean);
    if (Object.keys(body).length === 0) return { ok: false, error: "At least one field is required to update company." };

    const res = await utils.freshdeskRequest(opts, `/companies/${companyId}`, { method: "PUT", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      id: String(r.id || companyId),
      name: String(r.name || ""),
      description: String(r.description || ""),
      domains: Array.isArray(r.domains) ? r.domains.join(",") : ""
    };
  }
};
