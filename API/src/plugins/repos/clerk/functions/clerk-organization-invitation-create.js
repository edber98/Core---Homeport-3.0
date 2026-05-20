const { utils } = require("./utils");

module.exports = {
  async clerk_organization_invitation_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const organizationId = String(d.organizationId || "").trim();
    const emailAddress = String(d.emailAddress || "").trim();
    if (!organizationId) return { ok: false, error: "ID organisation requis." };
    if (!emailAddress) return { ok: false, error: "Email requis." };
    const body = { email_address: emailAddress, role: d.role || "org:member" };
    if (d.inviterUserId) body.inviter_user_id = String(d.inviterUserId);
    if (d.redirectUrl) body.redirect_url = String(d.redirectUrl);
    if (d.publicMetadata) {
      try { body.public_metadata = utils.parseJsonInput(d.publicMetadata, "Métadonnées publiques"); } catch (e) { return { ok: false, error: e.message }; }
    }
    log("Création de l'invitation organisation Clerk...");
    const res = await utils.clerkRequest(opts, `/organizations/${encodeURIComponent(organizationId)}/invitations`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.compactInvitation(res.data || {}) };
  }
};
