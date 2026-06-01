const { utils } = require("./utils");

module.exports = {
  async datadog_monitor_validate(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.query) return { ok: false, error: "Requête du monitor requise." };

    const body = { query: String(d.query) };
    const res = await utils.datadogRequest(opts, "/api/v1/monitor/validate", { method: "POST", body });
    if (!res.ok) return res;
    return { ok: true, id: "", name: "", type: "", query: String(d.query), message: "Monitor valide.", overall_state: "ok", tags: [], raw: res.data || null };
  }
};
