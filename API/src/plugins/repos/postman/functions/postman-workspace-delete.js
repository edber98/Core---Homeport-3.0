const { utils } = require("./utils");

module.exports = {
  async postman_workspace_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const workspaceId = String((inputs || {}).workspaceId || "").trim();
    if (!workspaceId) return { ok: false, error: "ID du workspace requis." };
    log("Suppression du workspace...");
    const res = await utils.postmanRequest(opts, `/workspaces/${encodeURIComponent(workspaceId)}`, { method: "DELETE" });
    if (!res.ok) return res;
    return utils.operationResult(res.data || {});
  }
};
