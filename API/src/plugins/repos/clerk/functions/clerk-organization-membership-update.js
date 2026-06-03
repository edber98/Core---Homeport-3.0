const { utils } = require("./utils");

module.exports = {
  async clerk_organization_membership_update(node, msg, inputs, opts) {
    const d = inputs || {};
    const organizationId = String(d.organizationId || "").trim();
    const userId = String(d.userId || "").trim();
    if (!organizationId) return { ok: false, error: "ID organisation requis." };
    if (!userId) return { ok: false, error: "ID utilisateur requis." };
    const role = String(d.role || "").trim();
    if (!role) return { ok: false, error: "Rôle requis." };

    const res = await utils.clerkRequest(opts, `/organizations/${encodeURIComponent(organizationId)}/memberships/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: { role }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.compactMembership(res.data || {}) };
  }
};
