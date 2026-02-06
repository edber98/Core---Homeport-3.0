const { utils } = require("./utils");

module.exports = {
  async anthropic_create_message_stream(node, msg, inputs, opts) {
    const d = inputs || {};
    const model = (d.model || "claude-sonnet-4-5-20250929").trim();
    const maxTokens = parseInt(d.maxTokens, 10) || 1024;
    const temperature = d.temperature != null ? Number(d.temperature) : 0.7;
    const system = (d.system || "").trim();
    const prompt = (d.prompt || "").trim();
    if (!prompt) return { ok: false, error: "Missing prompt." };

    let messages;
    try {
      const parsed = JSON.parse(d.messages || "[]");
      messages = Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
    } catch { messages = null; }

    if (!messages) {
      messages = [{ role: "user", content: prompt }];
    }

    const body = { model, max_tokens: maxTokens, messages, stream: true };
    if (system) body.system = system;
    if (temperature != null) body.temperature = temperature;

    const res = await utils.anthropicRequest(opts, "/messages", {
      method: "POST",
      body
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const text = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
    return { ok: true, text, model, stream: true };
  }
};
