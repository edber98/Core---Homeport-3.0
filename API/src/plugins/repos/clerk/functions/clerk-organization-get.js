const { utils } = require("./utils");

module.exports = {
  async clerk_organization_get(node, msg, inputs, opts) {
    const organizationId = String((inputs || {}).organizationId || "").trim();
    if (!organizationId) return { ok: false, error: "ID organisation requis." };
    const res = await utils.clerkRequest(opts, `/organizations/${encodeURIComponent(organizationId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.compactOrganization(res.data || {}) };
  }
};
