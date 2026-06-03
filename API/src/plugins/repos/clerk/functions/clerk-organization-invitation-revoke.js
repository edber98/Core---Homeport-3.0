const { utils } = require("./utils");

module.exports = {
  async clerk_organization_invitation_revoke(node, msg, inputs, opts) {
    const d = inputs || {};
    const organizationId = String(d.organizationId || "").trim();
    const invitationId = String(d.invitationId || "").trim();
    if (!organizationId) return { ok: false, error: "ID organisation requis." };
    if (!invitationId) return { ok: false, error: "ID invitation requis." };

    const res = await utils.clerkRequest(opts, `/organizations/${encodeURIComponent(organizationId)}/invitations/${encodeURIComponent(invitationId)}/revoke`, { method: "POST" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: invitationId, success: "true" };
  }
};
