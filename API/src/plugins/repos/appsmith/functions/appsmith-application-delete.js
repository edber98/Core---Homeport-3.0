const { utils } = require("./utils");

module.exports = {
  async appsmith_application_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const appId = String(d.appId || "").trim();
    if (!appId) return { ok: false, error: "Missing appId." };
    const res = await utils.appsmithRequest(opts, `/api/v1/applications/${encodeURIComponent(appId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return {
      ok: true,
      message: "Application supprimée.",
      raw: res.data
    };
  }
};
