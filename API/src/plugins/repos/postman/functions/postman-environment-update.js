const { utils } = require("./utils");

module.exports = {
  async postman_environment_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const environmentId = String(d.environmentId || "").trim();
    if (!environmentId) return { ok: false, error: "ID d'environnement requis." };
    let environment;
    try {
      environment = utils.parseJson(d.environment, "environnement", undefined);
    } catch (e) {
      return { ok: false, error: e.message };
    }
    if (!environment) return { ok: false, error: "Environnement requis." };
    log("Mise à jour de l'environnement...");
    const res = await utils.postmanRequest(opts, `/environments/${encodeURIComponent(environmentId)}`, {
      method: "PUT",
      body: { environment }
    });
    if (!res.ok) return res;
    return utils.resourceResult(res.data || {}, "environment");
  }
};
