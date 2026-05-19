const { utils } = require("./utils");

module.exports = {
  async postman_environment_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const environmentId = String((inputs || {}).environmentId || "").trim();
    if (!environmentId) return { ok: false, error: "ID d'environnement requis." };
    log("Récupération de l'environnement...");
    const res = await utils.postmanRequest(opts, `/environments/${encodeURIComponent(environmentId)}`);
    if (!res.ok) return res;
    return utils.resourceResult(res.data || {}, "environment");
  }
};
