const { utils } = require("./utils");

module.exports = {
  async mistral_create_fim_completion(node, msg, inputs, opts) {
    const d = inputs || {};
    const model = String(d.model || "codestral-latest").trim();
    const prompt = String(d.prompt || "").trim();
    if (!prompt) return { ok: false, error: "Missing prompt." };

    const body = {
      model,
      prompt,
      suffix: d.suffix ? String(d.suffix) : undefined,
      temperature: d.temperature != null && d.temperature !== "" ? Number(d.temperature) : undefined,
      max_tokens: d.maxTokens != null && d.maxTokens !== "" ? Number(d.maxTokens) : undefined
    };

    const res = await utils.mistralRequest(opts, "/fim/completions", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const choice = res.data?.choices?.[0] || {};
    return {
      ok: true,
      id: res.data?.id,
      model: res.data?.model || model,
      text: choice.message?.content || choice.text || "",
      finishReason: choice.finish_reason || "",
      promptTokens: res.data?.usage?.prompt_tokens,
      completionTokens: res.data?.usage?.completion_tokens,
      totalTokens: res.data?.usage?.total_tokens
    };
  }
};
