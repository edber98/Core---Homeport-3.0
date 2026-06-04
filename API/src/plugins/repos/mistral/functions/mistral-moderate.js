const { utils } = require("./utils");

module.exports = {
  async mistral_moderate(node, msg, inputs, opts) {
    const d = inputs || {};
    const model = String(d.model || "mistral-moderation-latest").trim();
    const input = String(d.moderationInput || "").trim();
    if (!input) return { ok: false, error: "Missing input." };

    const res = await utils.mistralRequest(opts, "/moderations", {
      method: "POST",
      body: { model, input }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const out = res.data?.results?.[0] || {};
    return {
      ok: true,
      id: res.data?.id || "",
      model,
      text: JSON.stringify(out.categories || {}),
      finishReason: "",
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    };
  }
};
