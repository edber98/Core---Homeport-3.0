const { utils } = require("./utils");
module.exports = {
  async appsmith_application_change_access(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    const branchedApplicationId = String(d.branchedApplicationId || "").trim();
    if (!branchedApplicationId) return { ok: false, error: "Missing branchedApplicationId." };
const options = {};
    const bodyJson = utils.safeJsonParse(d.bodyJson, 'bodyJson');
    if (bodyJson === undefined) return { ok: false, error: 'Missing bodyJson.' };
    options.json = bodyJson;
    const res = await utils.appsmithRequest(opts, `/api/v1/applications/${encodeURIComponent(String(d.branchedApplicationId || "").trim())}/changeAccess`, { method: 'PUT', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, raw: res.data };
  }
};
