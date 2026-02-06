const { utils } = require("./utils");

module.exports = {
  async mistral_create_completion_stream(node, msg, inputs, opts) {
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

    const body = { model, messages, stream: true };
    if (temperature != null) body.temperature = temperature;
    if (maxTokens) body.max_tokens = maxTokens;

    const res = await utils.mistralRequest(opts, "/chat/completions", {
      method: "POST",
      body
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const text = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
    return { ok: true, text, model, stream: true };
  }
};
