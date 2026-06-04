const { utils } = require("./utils");

module.exports = {
  async datadog_monitor_validate(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.validationQuery) return { ok: false, error: "Requête du monitor requise." };

    const body = { query: String(d.validationQuery) };
    const res = await utils.datadogRequest(opts, "/api/v1/monitor/validate", { method: "POST", body });
    if (!res.ok) return res;
    return { ok: true, id: "", name: "", type: "", query: String(d.validationQuery), message: "Monitor valide.", overall_state: "ok", tags: [], raw: res.data || null };
  }
};
