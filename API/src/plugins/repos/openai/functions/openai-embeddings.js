const { utils } = require("./utils");

module.exports = {
  async openai_embeddings(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const model = String(d.model || "text-embedding-3-small");
    const parsed = utils.parseJson(d.embeddingInput, null);
    const input = Array.isArray(parsed) ? parsed.map(String) : [String(d.embeddingInput || "")];

    log("Calcul des embeddings...");
    const res = await utils.openaiRequest(opts, "/embeddings", { model, input });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const vectors = Array.isArray(res.data?.data) ? res.data.data.map((item) => item.embedding || []) : [];
    return {
      ok: true,
      vectorsCount: vectors.length,
      dimensions: vectors[0] ? vectors[0].length : 0,
      vectors: JSON.stringify(vectors)
    };
  }
};
