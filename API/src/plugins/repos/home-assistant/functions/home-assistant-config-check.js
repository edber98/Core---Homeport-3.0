const { utils } = require("./utils");

module.exports = {
  async home_assistant_config_check(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log("Validation de la configuration...");
    const res = await utils.homeAssistantRequest(opts, "/api/config/core/check_config", { method: "POST", body: {} });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return {
      ok: true,
      result: res.data?.result || "",
      errors: res.data?.errors || null,
      raw: res.data || {}
    };
  }
};
