const { utils } = require("./utils");

module.exports = {
  async home_assistant_api_status(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log("Vérification de l'API...");
    const res = await utils.homeAssistantRequest(opts, "/api");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, message: typeof res.data === "string" ? res.data : (res.data?.message || "API disponible.") };
  }
};
