const { utils } = require("./utils");

module.exports = {
  async ollama_generate_response(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const model = String(d.model || "").trim();
    if (!model) return { ok: false, error: "Le modèle est requis." };

    const body = {
      model,
      stream: false
    };

    const prompt = String(d.prompt || "").trim();
    if (prompt) body.prompt = prompt;

    const system = String(d.system || "").trim();
    if (system) body.system = system;

    const suffix = String(d.suffix || "").trim();
    if (suffix) body.suffix = suffix;

    try {
      const images = utils.parseJsonInput(d.images, "images", undefined);
      if (Array.isArray(images) && images.length) body.images = images;
    } catch (e) {
      return { ok: false, error: e.message };
    }

    if (d.format !== undefined && d.format !== null && d.format !== "") {
      const rawFormat = String(d.format).trim();
      if (rawFormat === "json") body.format = "json";
      else {
        try { body.format = JSON.parse(rawFormat); }
        catch { return { ok: false, error: "JSON invalide dans format." }; }
      }
    }

    try {
      const options = utils.parseJsonInput(d.options, "options", undefined);
      if (options && typeof options === "object") body.options = options;
    } catch (e) {
      return { ok: false, error: e.message };
    }

    const think = utils.parseBoolean(d.think);
    if (think !== undefined) body.think = think;
    else if (["low", "medium", "high"].includes(String(d.think || "").toLowerCase())) body.think = String(d.think).toLowerCase();

    const raw = utils.parseBoolean(d.raw);
    if (raw !== undefined) body.raw = raw;

    const keepAlive = utils.parseKeepAlive(d.keepAlive);
    if (keepAlive !== undefined) body.keep_alive = keepAlive;

    const logprobs = utils.parseBoolean(d.logprobs);
    if (logprobs !== undefined) body.logprobs = logprobs;
    if (d.topLogprobs !== undefined && d.topLogprobs !== null && d.topLogprobs !== "") body.top_logprobs = Number(d.topLogprobs);

    log("Génération en cours...");
    const res = await utils.ollamaRequest(opts, "/api/generate", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const payload = res.data?.last || res.data || {};
    return {
      ok: true,
      id: payload.created_at || "",
      status: payload.done_reason || (payload.done ? "done" : "running"),
      name: payload.model || model,
      text: payload.response || "",
      thinking: payload.thinking || "",
      done: !!payload.done,
      created_at: payload.created_at || "",
      total_duration: Number(payload.total_duration || 0) || 0,
      prompt_eval_count: Number(payload.prompt_eval_count || 0) || 0,
      eval_count: Number(payload.eval_count || 0) || 0,
      result_json: utils.compactJson(payload)
    };
  }
};
