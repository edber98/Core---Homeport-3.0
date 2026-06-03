const { utils } = require("./utils");

module.exports = {
  async ollama_model_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const model = String(d.model || "").trim();
    if (!model) return { ok: false, error: "Le modèle est requis." };

    const body = { model };
    const res = await utils.ollamaRequest(opts, "/api/delete", { method: "DELETE", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const payload = res.data || {};
    return {
      ok: true,
      status: payload.status || "success",
      message: payload.status || "Modèle supprimé.",
      total: 0,
      completed: 0,
      result_json: utils.compactJson(payload)
    };
  }
};
