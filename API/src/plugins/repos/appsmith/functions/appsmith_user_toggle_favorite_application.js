const { utils } = require("./utils");
module.exports = {
  async appsmith_user_toggle_favorite_application(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    const applicationId = String(d.applicationId || "").trim();
    if (!applicationId) return { ok: false, error: "Missing applicationId." };
const options = {};
    const res = await utils.appsmithRequest(opts, `/api/v1/users/applications/${encodeURIComponent(String(d.applicationId || "").trim())}/favorite`, { method: 'PUT', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, raw: res.data };
  }
};
