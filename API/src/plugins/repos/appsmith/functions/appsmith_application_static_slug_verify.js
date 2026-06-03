const { utils } = require("./utils");
module.exports = {
  async appsmith_application_static_slug_verify(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    const branchedApplicationId = String(d.branchedApplicationId || "").trim();
    if (!branchedApplicationId) return { ok: false, error: "Missing branchedApplicationId." };
    const uniqueSlugName = String(d.uniqueSlugName || "").trim();
    if (!uniqueSlugName) return { ok: false, error: "Missing uniqueSlugName." };
const options = {};
    const res = await utils.appsmithRequest(opts, `/api/v1/applications/${encodeURIComponent(String(d.branchedApplicationId || "").trim())}/static-url/${encodeURIComponent(String(d.uniqueSlugName || "").trim())}`, { method: 'GET', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, raw: res.data };
  }
};
