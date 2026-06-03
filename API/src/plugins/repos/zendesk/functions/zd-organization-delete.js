const { utils } = require("./utils");
module.exports = {
  async zd_organization_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const organizationId = parseInt(d.organizationId, 10);
    if (isNaN(organizationId)) return { ok: false, error: "Missing organizationId." };
    const res = await utils.zendeskRequest(opts, `/organizations/${organizationId}.json`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, status: "deleted", message: "Organisation supprimée." };
  }
};
