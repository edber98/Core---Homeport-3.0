const { utils } = require("./utils");

module.exports = {
  async postman_environment_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const environmentId = String((inputs || {}).environmentId || "").trim();
    if (!environmentId) return { ok: false, error: "ID d'environnement requis." };
    log("Suppression de l'environnement...");
    const res = await utils.postmanRequest(opts, `/environments/${encodeURIComponent(environmentId)}`, { method: "DELETE" });
    if (!res.ok) return res;
    return utils.operationResult(res.data || {});
  }
};
