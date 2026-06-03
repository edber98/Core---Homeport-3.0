const { utils } = require("./utils");

module.exports = {
  async anthropic_create_message_json(node, msg, inputs, opts) {
    const d = inputs || {};
    const model = (d.model || "claude-sonnet-4-5-20250929").trim();
    const maxTokens = parseInt(d.maxTokens, 10) || 1024;
    const system = (d.system || "").trim();
    const prompt = (d.prompt || "").trim();
    if (!prompt) return { ok: false, error: "Missing prompt." };

    const body = {
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    };
    if (system) body.system = system;
    if (d.temperature != null && d.temperature !== "") body.temperature = Number(d.temperature);

    const res = await utils.anthropicRequest(opts, "/messages", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const r = utils.normalizeMessageResponse(res.data);
    return {
      ok: true,
      id: r.id,
      model: r.model,
      role: r.role,
      text: r.text || "",
      stopReason: r.stopReason,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens
    };
  }
};
