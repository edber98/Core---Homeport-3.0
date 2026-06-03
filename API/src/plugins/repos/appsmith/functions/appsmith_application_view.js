const { utils } = require("./utils");
module.exports = {
  async appsmith_application_view(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    const branchedApplicationId = String(d.branchedApplicationId || "").trim();
    if (!branchedApplicationId) return { ok: false, error: "Missing branchedApplicationId." };
const options = {};
    const res = await utils.appsmithRequest(opts, `/api/v1/applications/view/${encodeURIComponent(String(d.branchedApplicationId || "").trim())}`, { method: 'GET', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, raw: res.data };
  }
};
