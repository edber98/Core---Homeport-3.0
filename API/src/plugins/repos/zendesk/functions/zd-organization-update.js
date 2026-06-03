const { utils } = require("./utils");
module.exports = {
  async zd_organization_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const organizationId = parseInt(d.organizationId, 10);
    if (isNaN(organizationId)) return { ok: false, error: "Missing organizationId." };
    const organization = {};
    if (d.name) organization.name = d.name;
    if (d.domainNames) organization.domain_names = d.domainNames.split(",").map(s => s.trim()).filter(Boolean);
    if (d.notes) organization.notes = d.notes;
    const res = await utils.zendeskRequest(opts, `/organizations/${organizationId}.json`, { method: "PUT", body: { organization } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = (res.data && res.data.organization) || {};
    return { ok: true, id: String(r.id || ""), name: r.name || "", domainNames: (r.domain_names || []).join(", "), createdAt: r.created_at || "" };
  }
};
