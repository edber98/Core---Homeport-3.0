const { utils } = require("./utils");

module.exports = {
  async mistral_create_completion_json(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const model = (d.model || "mistral-small-latest").trim();
    const temperature = d.temperature != null ? Number(d.temperature) : 0.7;
    const maxTokens = d.maxTokens ? parseInt(d.maxTokens, 10) : undefined;
    const system = (d.system || "").trim();
    const prompt = (d.prompt || "").trim();
    if (!prompt) return { ok: false, error: "Missing prompt." };

    const messages = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content: prompt });

    const body = { model, messages, response_format: { type: "json_object" } };
    if (temperature != null) body.temperature = temperature;
    if (maxTokens) body.max_tokens = maxTokens;

    log('Envoi du prompt...');
    const res = await utils.mistralRequestStream(opts, "/chat/completions", { body }, (text) => log(text));
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    const text = r.text || "";
    let json = null;
    try { json = JSON.parse(text); } catch { json = null; }
    return {
      ok: true,
      id: r.id,
      model: r.model,
      text,
      json,
      finishReason: r.finishReason,
      promptTokens: r.promptTokens,
      completionTokens: r.completionTokens
    };
  }
};
