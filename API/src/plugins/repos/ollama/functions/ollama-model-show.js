const { utils } = require("./utils");

module.exports = {
  async ollama_model_show(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const model = String(d.model || "").trim();
    if (!model) return { ok: false, error: "Le modèle est requis." };

    const body = { model };
    const verbose = utils.parseBoolean(d.verbose);
    if (verbose !== undefined) body.verbose = verbose;

    log("Récupération des détails du modèle...");
    const res = await utils.ollamaRequest(opts, "/api/show", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const payload = res.data || {};
    return {
      ok: true,
      id: model,
      status: "ok",
      name: model,
      url: `https://ollama.com/library/${encodeURIComponent(model.split(":")[0])}`,
      text: payload.template || payload.license || "",
      thinking: "",
      done: true,
      created_at: payload.modified_at || "",
      total_duration: 0,
      prompt_eval_count: 0,
      eval_count: 0,
      result_json: utils.compactJson(payload)
    };
  }
};
