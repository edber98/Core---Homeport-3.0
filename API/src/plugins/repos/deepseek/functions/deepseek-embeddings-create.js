const { utils } = require("./utils");

module.exports = {
  async deepseek_embeddings_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const input = d.embeddingInput;
    if (input === undefined || input === null || input === "") return { ok: false, error: "Input requis." };
    const body = {
      model: String(d.model || "deepseek-embedding").trim(),
      input
    };
    const res = await utils.deepseekRequest(opts, "/embeddings", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: res.data?.object || "embedding", status: String(res.status || ""), name: body.model, text: "", result_json: utils.compactJson(res.data) };
  }
};
