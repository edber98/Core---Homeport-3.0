const { utils } = require("./utils");

module.exports = {
  async appsmith_tenant_current(node, msg, inputs, opts) {
    const res = await utils.appsmithRequest(opts, "/api/v1/tenants/current");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.normalizeTenant(res.data || {}) };
  }
};
