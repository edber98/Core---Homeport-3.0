const { utils } = require("./utils");

module.exports = {
  async home_assistant_config_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log("Récupération de la configuration...");
    const res = await utils.homeAssistantRequest(opts, "/api/config");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const c = res.data || {};
    return {
      ok: true,
      location_name: c.location_name || "",
      version: c.version || "",
      time_zone: c.time_zone || "",
      unit_system: c.unit_system ? JSON.stringify(c.unit_system) : "",
      latitude: c.latitude,
      longitude: c.longitude,
      raw: c
    };
  }
};
