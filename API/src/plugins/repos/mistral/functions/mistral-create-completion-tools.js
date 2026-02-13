const { utils } = require("./utils");

module.exports = {
  async mistral_create_completion_tools(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const model = (d.model || "mistral-small-latest").trim();
    const temperature = d.temperature != null ? Number(d.temperature) : 0.7;
    const maxTokens = d.maxTokens ? parseInt(d.maxTokens, 10) : undefined;
    const system = (d.system || "").trim();
    const prompt = (d.prompt || "").trim();
    if (!prompt) return { ok: false, error: "Missing prompt." };

    let tools;
    try { tools = JSON.parse(d.tools || "[]"); } catch { tools = []; }
    if (!Array.isArray(tools) || tools.length === 0) return { ok: false, error: "Missing tools (JSON array)." };

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

    const body = { model, messages, tools };
    if (temperature != null) body.temperature = temperature;
    if (maxTokens) body.max_tokens = maxTokens;
    if (d.toolChoice) body.tool_choice = d.toolChoice;

    log('Envoi du prompt...');
    const res = await utils.mistralRequestStream(opts, "/chat/completions", { body }, (text) => log(text));
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      id: r.id,
      model: r.model,
      text: r.text || "",
      toolCalls: [],
      finishReason: r.finishReason,
      promptTokens: r.promptTokens,
      completionTokens: r.completionTokens
    };
  }
};
