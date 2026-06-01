const { utils } = require("./utils");

module.exports = {
  async datadog_dashboard_create(node, msg, inputs, opts) {
    const d = inputs || {};
    if (!d.title) return { ok: false, error: "Titre du dashboard requis." };

    let definition;
    try {
      definition = utils.parseJson(d.definition, "definition", {});
    } catch (e) {
      return { ok: false, error: e.message };
    }

    const body = { title: String(d.title), ...definition };
    const res = await utils.datadogRequest(opts, "/api/v1/dashboard", { method: "POST", body });
    if (!res.ok) return res;
    return { ok: true, ...utils.dashboardSummary(res.data || {}), raw: res.data };
  }
};
