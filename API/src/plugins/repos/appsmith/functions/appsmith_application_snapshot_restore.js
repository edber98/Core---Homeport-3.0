const { utils } = require("./utils");
module.exports = {
  async appsmith_application_snapshot_restore(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    const branchedApplicationId = String(d.branchedApplicationId || "").trim();
    if (!branchedApplicationId) return { ok: false, error: "Missing branchedApplicationId." };
const options = {};
    const res = await utils.appsmithRequest(opts, `/api/v1/applications/snapshot/${encodeURIComponent(String(d.branchedApplicationId || "").trim())}/restore`, { method: 'POST', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, raw: res.data };
  }
};
