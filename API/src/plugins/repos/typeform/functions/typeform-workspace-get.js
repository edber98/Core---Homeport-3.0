const { utils } = require("./utils");

module.exports = {
  async typeform_workspace_get(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!(d.workspaceId || "").trim()) return { ok: false, error: "Missing workspaceId." };

    const res = await utils.typeformRequest(opts, `/workspaces/${d.workspaceId}`);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = res.data || {};
    return { ok: true, id: r.id, name: r.name, shared: String(r.shared || false), default: String(r.default || false) };
  }
};
