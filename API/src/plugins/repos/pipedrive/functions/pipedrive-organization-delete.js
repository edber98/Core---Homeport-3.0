const { utils } = require("./utils");

module.exports = {
  async pipedrive_organization_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const orgId = (d.orgId || "").toString().trim();
    if (!orgId) return { ok: false, error: "Missing orgId." };

    const res = await utils.pdRequest(opts, `/organizations/${encodeURIComponent(orgId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, status: "deleted", message: `Organization ${orgId} deleted.` };
  }
};
