const { utils } = require("./utils");
module.exports = {
  async appsmith_application_logo_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    const branchedApplicationId = String(d.branchedApplicationId || "").trim();
    if (!branchedApplicationId) return { ok: false, error: "Missing branchedApplicationId." };
const options = {};
    const res = await utils.appsmithRequest(opts, `/api/v1/applications/${encodeURIComponent(String(d.branchedApplicationId || "").trim())}/logo`, { method: 'DELETE', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, message: 'Opération terminée.', raw: res.data };
  }
};
