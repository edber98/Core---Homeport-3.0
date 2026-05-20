const { utils } = require("./utils");

module.exports = {
  async clerk_organization_membership_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const organizationId = String(d.organizationId || "").trim();
    const userId = String(d.userId || "").trim();
    if (!organizationId) return { ok: false, error: "ID organisation requis." };
    if (!userId) return { ok: false, error: "ID utilisateur requis." };
    log("Ajout du membre Clerk...");
    const res = await utils.clerkRequest(opts, `/organizations/${encodeURIComponent(organizationId)}/memberships`, { method: "POST", body: { user_id: userId, role: d.role || "org:member" } });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.compactMembership(res.data || {}) };
  }
};
