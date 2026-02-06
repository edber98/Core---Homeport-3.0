const { utils } = require("./utils");

module.exports = {
  async anthropic_count_tokens(node, msg, inputs, opts) {
    const d = inputs || {};
    const model = (d.model || "claude-sonnet-4-5-20250929").trim();
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

    const body = { model, messages };
    if (d.system) body.system = d.system.trim();

    const res = await utils.anthropicRequest(opts, "/messages/count_tokens", {
      method: "POST",
      body
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return { ok: true, inputTokens: r.input_tokens };
  }
};
