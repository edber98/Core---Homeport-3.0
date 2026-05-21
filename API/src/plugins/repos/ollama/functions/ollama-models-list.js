const { utils } = require("./utils");

module.exports = {
  async ollama_models_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log("Récupération des modèles locaux...");
    const res = await utils.ollamaRequest(opts, "/api/tags", { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const rawItems = Array.isArray(res.data?.models) ? res.data.models : [];
    const items = rawItems.map(utils.normalizeListItem);
    return {
      ok: true,
      items,
      totalCount: items.length,
      nextCursor: ""
    };
  }
};
