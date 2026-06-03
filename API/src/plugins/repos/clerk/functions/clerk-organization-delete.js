const { utils } = require("./utils");

module.exports = {
  async clerk_organization_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const organizationId = String((inputs || {}).organizationId || "").trim();
    if (!organizationId) return { ok: false, error: "ID organisation requis." };
    log("Suppression de l'organisation Clerk...");
    const res = await utils.clerkRequest(opts, `/organizations/${encodeURIComponent(organizationId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: organizationId, success: true };
  }
};
