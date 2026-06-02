const { utils } = require("./utils");
module.exports = {
  async appsmith_workspace_permission_groups_list(node, msg, inputs, opts) {
    const d = inputs || {};
    const query = {};
    const workspaceId = String(d.workspaceId || "").trim();
    if (!workspaceId) return { ok: false, error: "Missing workspaceId." };
const options = {};
    const res = await utils.appsmithRequest(opts, `/api/v1/workspaces/${encodeURIComponent(String(d.workspaceId || "").trim())}/permissionGroups`, { method: 'GET', query, ...options });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const items = utils.toArray(res.data); return { ok: true, items, totalCount: items.length, raw: res.data };
  }
};
