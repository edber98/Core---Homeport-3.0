const { utils } = require("./utils");
module.exports = {
  async appsmith_git_auto_commit_progress(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    const baseApplicationId = String(d.baseApplicationId || "").trim();
    if (!baseApplicationId) return { ok: false, error: "Missing baseApplicationId." };
const options = {};
    const res = await utils.appsmithRequest(opts, `/api/v1/git/auto-commit/progress/app/${encodeURIComponent(String(d.baseApplicationId || "").trim())}`, { method: 'GET', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, raw: res.data };
  }
};
