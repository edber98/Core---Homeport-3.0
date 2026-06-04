const { utils } = require("./utils");

module.exports = {
  async ollama_embeddings_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const model = String(d.model || "").trim();
    if (!model) return { ok: false, error: "Le modèle est requis." };

    let input = null;
    try {
      const parsed = utils.parseJsonInput(d.embeddingInputs, "inputs", null);
      if (Array.isArray(parsed) && parsed.length) input = parsed.map((x) => String(x));
      else if (typeof parsed === "string" && parsed.trim()) input = parsed.trim();
    } catch (e) {
      return { ok: false, error: e.message };
    }

    const inputText = String(d.embeddingInput || "").trim();
    if (input === null) input = inputText;
    if (!input || (Array.isArray(input) && input.length === 0)) return { ok: false, error: "Un texte d'entrée est requis." };

    const body = {
      model,
      input
    };

    const truncate = utils.parseBoolean(d.truncate);
    if (truncate !== undefined) body.truncate = truncate;

    if (d.dimensions !== undefined && d.dimensions !== null && d.dimensions !== "") body.dimensions = Number(d.dimensions);

    const keepAlive = utils.parseKeepAlive(d.keepAlive);
    if (keepAlive !== undefined) body.keep_alive = keepAlive;

    try {
      const options = utils.parseJsonInput(d.embeddingOptions, "options", undefined);
      if (options && typeof options === "object") body.options = options;
    } catch (e) {
      return { ok: false, error: e.message };
    }

    log("Calcul des embeddings...");
    const res = await utils.ollamaRequest(opts, "/api/embed", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const payload = res.data || {};
    const vectors = Array.isArray(payload.embeddings) ? payload.embeddings : [];
    return {
      ok: true,
      model: payload.model || model,
      vectorsCount: vectors.length,
      dimensions: vectors[0] ? vectors[0].length : 0,
      vectors_json: utils.compactJson(vectors),
      total_duration: Number(payload.total_duration || 0) || 0,
      prompt_eval_count: Number(payload.prompt_eval_count || 0) || 0
    };
  }
};
