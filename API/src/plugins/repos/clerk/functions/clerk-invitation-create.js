const { utils } = require("./utils");

module.exports = {
  async clerk_invitation_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const emailAddress = String(d.emailAddress || "").trim();
    if (!emailAddress) return { ok: false, error: "Email requis." };
    const body = { email_address: emailAddress };
    if (d.redirectUrl) body.redirect_url = String(d.redirectUrl);
    if (d.publicMetadata) {
      try { body.public_metadata = utils.parseJsonInput(d.publicMetadata, "Métadonnées publiques"); } catch (e) { return { ok: false, error: e.message }; }
    }
    log("Création de l'invitation Clerk...");
    const res = await utils.clerkRequest(opts, "/invitations", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.compactInvitation(res.data || {}) };
  }
};
