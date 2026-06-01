const { utils } = require("./utils");

module.exports = {
  async fd_company_delete(node, msg, inputs, opts) {
    const companyId = parseInt((inputs || {}).companyId, 10);
    if (!Number.isFinite(companyId) || companyId <= 0) return { ok: false, error: "Missing or invalid companyId." };

    const res = await utils.freshdeskRequest(opts, `/companies/${companyId}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, success: "true", id: String(companyId), event: "company_deleted" };
  }
};
