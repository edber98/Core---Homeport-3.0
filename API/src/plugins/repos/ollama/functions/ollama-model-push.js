const { utils } = require("./utils");

module.exports = {
  async ollama_model_push(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const model = String(d.model || "").trim();
    if (!model) return { ok: false, error: "Le modèle est requis." };

    const body = { model, stream: false };
    const insecure = utils.parseBoolean(d.insecure);
    if (insecure !== undefined) body.insecure = insecure;

    log("Publication du modèle en cours...");
    const res = await utils.ollamaRequest(opts, "/api/push", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const payload = res.data?.last || res.data || {};
    return {
      ok: true,
      status: payload.status || "success",
      message: payload.status || "Modèle publié.",
      total: Number(payload.total || 0) || 0,
      completed: Number(payload.completed || 0) || 0,
      result_json: utils.compactJson(payload)
    };
  }
};
