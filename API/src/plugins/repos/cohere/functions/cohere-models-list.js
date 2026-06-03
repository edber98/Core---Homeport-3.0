const { utils } = require("./utils");

module.exports = {
  async cohere_models_list(node, msg, inputs, opts) {
    const res = await utils.cohereRequest(opts, "/v1/models");
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const items = Array.isArray(res.data?.models) ? res.data.models : (Array.isArray(res.data) ? res.data : []);
    return {
      ok: true,
      items: items.map((m) => ({
        id: String(m.name || m.id || ""),
        name: String(m.name || m.id || ""),
        status: String(m.status || ""),
        url: "",
        text: "",
        result_json: utils.compactJson(m)
      })),
      totalCount: items.length,
      nextCursor: ""
    };
  }
};
