const { utils } = require("./utils");

module.exports = {
  async postman_environment_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const name = String(d.name || "").trim();
    if (!name) return { ok: false, error: "Nom d'environnement requis." };
    let values;
    try {
      values = utils.parseJson(d.values, "variables", []);
    } catch (e) {
      return { ok: false, error: e.message };
    }
    const environment = { name, values: Array.isArray(values) ? values : [] };
    log("Création de l'environnement...");
    const res = await utils.postmanRequest(opts, "/environments", {
      method: "POST",
      query: { workspace: d.workspaceId },
      body: { environment }
    });
    if (!res.ok) return res;
    return utils.resourceResult(res.data || {}, "environment");
  }
};
