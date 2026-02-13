const { utils } = require("./utils");

module.exports = {
  async mistral_create_embedding(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const model = (d.model || "mistral-embed").trim();
    const input = (d.input || "").trim();
    if (!input) return { ok: false, error: "Missing input text." };

    let inputArray;
    try {
      const parsed = JSON.parse(input);
      inputArray = Array.isArray(parsed) ? parsed : [input];
    } catch { inputArray = [input]; }

    log('Calcul des embeddings...');
    const res = await utils.mistralRequest(opts, "/embeddings", {
      method: "POST",
      body: { model, input: inputArray }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    const vectors = (r.data || []).map(d => d.embedding);
    return {
      ok: true,
      model: r.model,
      vectorsCount: vectors.length,
      dimensions: vectors[0] ? vectors[0].length : 0,
      vectors
    };
  }
};
