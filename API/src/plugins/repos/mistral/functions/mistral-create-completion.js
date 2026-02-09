const { utils } = require("./utils");

module.exports = {
  async mistral_create_completion(node, msg, inputs, opts) {
    const d = inputs || {};
    const model = (d.model || "mistral-small-latest").trim();
    const temperature = d.temperature != null ? Number(d.temperature) : 0.7;
    const maxTokens = d.maxTokens ? parseInt(d.maxTokens, 10) : undefined;
    const system = (d.system || "").trim();
    const prompt = (d.prompt || "").trim();
    if (!prompt) return { ok: false, error: "Missing prompt." };

    let messages;
    try {
      const parsed = JSON.parse(d.messages || "[]");
      messages = Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
    } catch { messages = null; }

    if (!messages) {
      messages = [];
      if (system) messages.push({ role: "system", content: system });
      messages.push({ role: "user", content: prompt });
    }

    const body = { model, messages };
    if (temperature != null) body.temperature = temperature;
    if (maxTokens) body.max_tokens = maxTokens;
    if (d.topP != null) body.top_p = Number(d.topP);

    const res = await utils.mistralRequest(opts, "/chat/completions", {
      method: "POST",
      body
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    const choice = (r.choices || [])[0] || {};
    return {
      ok: true,
      id: r.id,
      model: r.model,
      text: choice.message?.content || "",
      finishReason: choice.finish_reason,
      promptTokens: r.usage?.prompt_tokens,
      completionTokens: r.usage?.completion_tokens,
      totalTokens: r.usage?.total_tokens
    };
  }
};
