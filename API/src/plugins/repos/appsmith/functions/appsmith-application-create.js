const { utils } = require("./utils");

module.exports = {
  async appsmith_application_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const bodyJson = utils.safeJsonParse(d.bodyJson, "bodyJson");
    if (bodyJson === undefined) return { ok: false, error: "Missing bodyJson." };
    const res = await utils.appsmithRequest(opts, "/api/v1/applications", { method: "POST", json: bodyJson });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, ...utils.normalizeApp(res.data || {}) };
  }
};
