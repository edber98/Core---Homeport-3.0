const { utils } = require("./utils");

module.exports = {
  async groq_models_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log("Récupération des modèles...");
    const res = await utils.groqRequest(opts, "/models");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const rawItems = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data?.models) ? res.data.models : [];
    const items = rawItems.map((item) => ({
      id: item.id || item.name || "",
      name: item.id || item.name || "",
      status: item.owned_by || item.context_window ? String(item.owned_by || item.context_window) : "",
      result_json: utils.compactJson(item)
    }));
    return { ok: true, items, totalCount: items.length, nextCursor: "" };
  }
};
