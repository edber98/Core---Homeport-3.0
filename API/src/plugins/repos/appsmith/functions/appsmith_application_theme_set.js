const { utils } = require("./utils");
module.exports = {
  async appsmith_application_theme_set(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    const branchedApplicationId = String(d.branchedApplicationId || "").trim();
    if (!branchedApplicationId) return { ok: false, error: "Missing branchedApplicationId." };
    const themeId = String(d.themeId || "").trim();
    if (!themeId) return { ok: false, error: "Missing themeId." };
const options = {};
    const res = await utils.appsmithRequest(opts, `/api/v1/applications/${encodeURIComponent(String(d.branchedApplicationId || "").trim())}/themes/${encodeURIComponent(String(d.themeId || "").trim())}`, { method: 'PATCH', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, raw: res.data };
  }
};
