const { utils } = require("./utils");

module.exports = {
  async clerk_organization_invitations_bulk_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const organizationId = String(d.organizationId || "").trim();
    if (!organizationId) return { ok: false, error: "ID organisation requis." };

    const emails = utils.parseList(d.emailAddresses);
    if (!emails.length) return { ok: false, error: "Au moins un email est requis." };
    const role = String(d.role || "org:member");
    const body = {
      invitations: emails.map((email) => ({ email_address: email, role, redirect_url: d.redirectUrl || undefined }))
    };

    const res = await utils.clerkRequest(opts, `/organizations/${encodeURIComponent(organizationId)}/invitations/bulk`, { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const invitations = utils.listData(res.data).map(utils.compactInvitation);
    return { ok: true, invitations, totalCount: invitations.length };
  }
};
