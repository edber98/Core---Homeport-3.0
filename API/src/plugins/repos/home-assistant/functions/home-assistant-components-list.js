const { utils } = require("./utils");

module.exports = {
  async home_assistant_components_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const search = String(d.search || "").trim().toLowerCase();
    const limit = utils.toPositiveInt(d.pageSize, 200, 1000);
    log("Récupération des composants...");
    const res = await utils.homeAssistantRequest(opts, "/api/components");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const raw = Array.isArray(res.data) ? res.data : [];
    const components = raw
      .map((component) => ({ component: String(component || "") }))
      .filter((item) => !search || item.component.toLowerCase().includes(search))
      .slice(0, limit);
    return { ok: true, components, totalCount: components.length };
  }
};
