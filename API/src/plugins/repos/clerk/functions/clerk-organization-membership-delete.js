const { utils } = require("./utils");

module.exports = {
  async clerk_organization_membership_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const organizationId = String(d.organizationId || "").trim();
    const userId = String(d.userId || "").trim();
    if (!organizationId) return { ok: false, error: "ID organisation requis." };
    if (!userId) return { ok: false, error: "ID utilisateur requis." };

    const res = await utils.clerkRequest(opts, `/organizations/${encodeURIComponent(organizationId)}/memberships/${encodeURIComponent(userId)}`, {
      method: "DELETE"
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: userId, success: "true" };
  }
};
