const { utils } = require("./utils");

module.exports = {
  async clerk_organization_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const organizationId = String(d.organizationId || "").trim();
    if (!organizationId) return { ok: false, error: "ID organisation requis." };
    const body = {};
    if (d.name !== undefined) body.name = String(d.name || "");
    if (d.slug !== undefined) body.slug = String(d.slug || "");
    if (d.maxAllowedMemberships) body.max_allowed_memberships = parseInt(d.maxAllowedMemberships, 10);
    if (d.publicMetadata) {
      try { body.public_metadata = utils.parseJsonInput(d.publicMetadata, "Métadonnées publiques"); } catch (e) { return { ok: false, error: e.message }; }
    }
    if (!Object.keys(body).length) return { ok: false, error: "Aucun champ à modifier." };
    log("Mise à jour de l'organisation Clerk...");
    const res = await utils.clerkRequest(opts, `/organizations/${encodeURIComponent(organizationId)}`, { method: "PATCH", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.compactOrganization(res.data || {}) };
  }
};
