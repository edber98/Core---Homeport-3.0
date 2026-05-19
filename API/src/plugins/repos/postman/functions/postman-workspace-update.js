const { utils } = require("./utils");

module.exports = {
  async postman_workspace_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const workspaceId = String(d.workspaceId || "").trim();
    if (!workspaceId) return { ok: false, error: "ID du workspace requis." };
    const workspace = utils.compact({ name: d.name, type: d.type, description: d.description });
    log("Mise à jour du workspace...");
    const res = await utils.postmanRequest(opts, `/workspaces/${encodeURIComponent(workspaceId)}`, { method: "PUT", body: { workspace } });
    if (!res.ok) return res;
    return utils.resourceResult(res.data || {}, "workspace");
  }
};
