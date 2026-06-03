const { utils } = require("./utils");

module.exports = {
  async appsmith_application_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const appId = String(d.appId || "").trim();
    if (!appId) return { ok: false, error: "Missing appId." };
    const res = await utils.appsmithRequest(opts, `/api/v1/applications/${encodeURIComponent(appId)}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.normalizeApp(res.data || {}) };
  }
};
