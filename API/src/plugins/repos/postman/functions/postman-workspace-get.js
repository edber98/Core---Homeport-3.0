const { utils } = require("./utils");

module.exports = {
  async postman_workspace_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const workspaceId = String((inputs || {}).workspaceId || "").trim();
    if (!workspaceId) return { ok: false, error: "ID du workspace requis." };
    log("Récupération du workspace...");
    const res = await utils.postmanRequest(opts, `/workspaces/${encodeURIComponent(workspaceId)}`);
    if (!res.ok) return res;
    return utils.resourceResult(res.data || {}, "workspace");
  }
};
