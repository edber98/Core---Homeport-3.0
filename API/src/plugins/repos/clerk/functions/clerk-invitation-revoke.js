const { utils } = require("./utils");

module.exports = {
  async clerk_invitation_revoke(node, msg, inputs, opts) {
    const d = inputs || {};
    const invitationId = String(d.invitationId || "").trim();
    if (!invitationId) return { ok: false, error: "ID invitation requis." };

    const res = await utils.clerkRequest(opts, `/invitations/${encodeURIComponent(invitationId)}/revoke`, { method: "POST" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: invitationId, success: "true" };
  }
};
