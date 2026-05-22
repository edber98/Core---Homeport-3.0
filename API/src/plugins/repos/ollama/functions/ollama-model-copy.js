const { utils } = require("./utils");

module.exports = {
  async ollama_model_copy(node, msg, inputs, opts) {
    const d = inputs || {};
    const source = String(d.source || "").trim();
    const destination = String(d.destination || "").trim();
    if (!source) return { ok: false, error: "Le modèle source est requis." };
    if (!destination) return { ok: false, error: "Le modèle destination est requis." };

    const body = { source, destination };
    const res = await utils.ollamaRequest(opts, "/api/copy", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const payload = res.data || {};
    return {
      ok: true,
      status: payload.status || "success",
      message: payload.status || "Modèle copié.",
      total: 0,
      completed: 0,
      result_json: utils.compactJson(payload)
    };
  }
};
