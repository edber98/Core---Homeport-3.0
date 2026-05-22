const { utils } = require("./utils");

module.exports = {
  async ollama_model_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const model = String(d.model || "").trim();
    if (!model) return { ok: false, error: "Le nom du modèle est requis." };

    const body = { model, stream: false };

    const fromModel = String(d.fromModel || "").trim();
    if (fromModel) body.from = fromModel;

    const template = String(d.template || "").trim();
    if (template) body.template = template;

    const system = String(d.system || "").trim();
    if (system) body.system = system;

    const modelfile = String(d.modelfile || "").trim();
    if (modelfile) body.modelfile = modelfile;

    const quantize = String(d.quantize || "").trim();
    if (quantize) body.quantize = quantize;

    if (d.license !== undefined && d.license !== null && d.license !== "") {
      const rawLicense = String(d.license).trim();
      if (rawLicense.startsWith("[") || rawLicense.startsWith("{")) {
        try { body.license = JSON.parse(rawLicense); }
        catch { return { ok: false, error: "JSON invalide dans license." }; }
      } else {
        body.license = rawLicense;
      }
    }

    try {
      const parameters = utils.parseJsonInput(d.parameters, "parameters", undefined);
      if (parameters && typeof parameters === "object") body.parameters = parameters;
    } catch (e) {
      return { ok: false, error: e.message };
    }

    try {
      const messages = utils.parseJsonInput(d.messages, "messages", undefined);
      if (Array.isArray(messages) && messages.length) body.messages = messages;
    } catch (e) {
      return { ok: false, error: e.message };
    }

    log("Création du modèle en cours...");
    const res = await utils.ollamaRequest(opts, "/api/create", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const payload = res.data?.last || res.data || {};
    return {
      ok: true,
      status: payload.status || "success",
      message: payload.status || "Modèle créé.",
      total: Number(payload.total || 0) || 0,
      completed: Number(payload.completed || 0) || 0,
      result_json: utils.compactJson(payload)
    };
  }
};
