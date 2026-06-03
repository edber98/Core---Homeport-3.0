const { utils } = require("./utils");

module.exports = {
  async groq_embeddings_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const input = d.input;
    if (input === undefined || input === null || input === "") return { ok: false, error: "input requis." };
    const body = {
      model: String(d.model || "text-embedding-3-small").trim(),
      input
    };
    const res = await utils.groqRequest(opts, "/embeddings", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: res.data?.data?.[0]?.index?.toString?.() || "", status: res.data?.object || "list", name: body.model, text: "Embedding généré", result_json: utils.compactJson(res.data) };
  }
};
