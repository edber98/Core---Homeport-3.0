const { utils } = require("./utils");

module.exports = {
  async clerk_organization_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const name = String(d.name || "").trim();
    if (!name) return { ok: false, error: "Nom requis." };
    const body = { name };
    if (d.slug) body.slug = String(d.slug);
    if (d.createdBy) body.created_by = String(d.createdBy);
    if (d.maxAllowedMemberships) body.max_allowed_memberships = parseInt(d.maxAllowedMemberships, 10);
    if (d.publicMetadata) {
      try { body.public_metadata = utils.parseJsonInput(d.publicMetadata, "Métadonnées publiques"); } catch (e) { return { ok: false, error: e.message }; }
    }
    log("Création de l'organisation Clerk...");
    const res = await utils.clerkRequest(opts, "/organizations", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.compactOrganization(res.data || {}) };
  }
};
