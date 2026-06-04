const { utils } = require("./utils");

module.exports = {
  async ollama_chat_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const model = String(d.model || "").trim();
    if (!model) return { ok: false, error: "Le modèle est requis." };

    let messages = [];
    try {
      const rawMessages = utils.parseJsonInput(d.messages, "messages", null);
      if (Array.isArray(rawMessages)) messages = rawMessages;
    } catch (e) {
      return { ok: false, error: e.message };
    }

    const prompt = String(d.prompt || "").trim();
    const system = String(d.system || "").trim();
    if (!messages.length) {
      if (!prompt) return { ok: false, error: "Le prompt est requis quand messages est vide." };
      if (system) messages.push({ role: "system", content: system });
      messages.push({ role: "user", content: prompt });
    }

    const body = { model, messages, stream: false };

    try {
      const tools = utils.parseJsonInput(d.tools, "tools", undefined);
      if (Array.isArray(tools) && tools.length) body.tools = tools;
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
      const options = utils.parseJsonInput(d.generationOptions, "options", undefined);
      if (options && typeof options === "object") body.options = options;
    } catch (e) {
      return { ok: false, error: e.message };
    }

    const think = utils.parseBoolean(d.think);
    if (think !== undefined) body.think = think;
    else if (["low", "medium", "high"].includes(String(d.think || "").toLowerCase())) body.think = String(d.think).toLowerCase();

    const keepAlive = utils.parseKeepAlive(d.keepAlive);
    if (keepAlive !== undefined) body.keep_alive = keepAlive;

    const logprobs = utils.parseBoolean(d.logprobs);
    if (logprobs !== undefined) body.logprobs = logprobs;
    if (d.topLogprobs !== undefined && d.topLogprobs !== null && d.topLogprobs !== "") body.top_logprobs = Number(d.topLogprobs);

    log("Envoi du message au modèle...");
    const res = await utils.ollamaRequest(opts, "/api/chat", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const payload = res.data?.last || res.data || {};
    const message = payload.message || {};
    return {
      ok: true,
      id: payload.created_at || "",
      status: payload.done_reason || (payload.done ? "done" : "running"),
      name: payload.model || model,
      text: message.content || "",
      thinking: message.thinking || "",
      done: !!payload.done,
      created_at: payload.created_at || "",
      total_duration: Number(payload.total_duration || 0) || 0,
      prompt_eval_count: Number(payload.prompt_eval_count || 0) || 0,
      eval_count: Number(payload.eval_count || 0) || 0,
      result_json: utils.compactJson(payload)
    };
  }
};
