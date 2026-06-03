const { utils } = require("./utils");
module.exports = {
  async appsmith_git_profile_app_save(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    const baseApplicationId = String(d.baseApplicationId || "").trim();
    if (!baseApplicationId) return { ok: false, error: "Missing baseApplicationId." };
const options = {};
    const bodyJson = utils.safeJsonParse(d.bodyJson, 'bodyJson');
    if (bodyJson === undefined) return { ok: false, error: 'Missing bodyJson.' };
    options.json = bodyJson;
    const res = await utils.appsmithRequest(opts, `/api/v1/git/profile/app/${encodeURIComponent(String(d.baseApplicationId || "").trim())}`, { method: 'PUT', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, raw: res.data };
  }
};
