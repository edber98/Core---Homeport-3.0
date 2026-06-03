const { utils } = require("./utils");
module.exports = {
  async appsmith_user_leave_workspace(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    const workspaceId = String(d.workspaceId || "").trim();
    if (!workspaceId) return { ok: false, error: "Missing workspaceId." };
const options = {};
    const res = await utils.appsmithRequest(opts, `/api/v1/users/leaveWorkspace/${encodeURIComponent(String(d.workspaceId || "").trim())}`, { method: 'PUT', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, raw: res.data };
  }
};
