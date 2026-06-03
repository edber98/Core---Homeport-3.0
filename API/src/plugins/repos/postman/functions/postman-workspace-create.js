const { utils } = require("./utils");

module.exports = {
  async postman_workspace_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const name = String(d.name || "").trim();
    if (!name) return { ok: false, error: "Nom du workspace requis." };
    const workspace = utils.compact({ name, type: d.type || "personal", description: d.description });
    log("Création du workspace...");
    const res = await utils.postmanRequest(opts, "/workspaces", { method: "POST", body: { workspace } });
    if (!res.ok) return res;
    return utils.resourceResult(res.data || {}, "workspace");
  }
};
