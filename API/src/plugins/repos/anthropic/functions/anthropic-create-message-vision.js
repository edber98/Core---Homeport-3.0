const { utils } = require("./utils");

module.exports = {
  async anthropic_create_message_vision(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const model = (d.model || "claude-sonnet-4-5-20250929").trim();
    const maxTokens = parseInt(d.maxTokens, 10) || 1024;
    const temperature = d.temperature != null ? Number(d.temperature) : 0.7;
    const system = (d.system || "").trim();
    const prompt = (d.prompt || "").trim();
    const imageUrl = (d.imageUrl || "").trim();
    if (!prompt) return { ok: false, error: "Missing prompt." };
    if (!imageUrl) return { ok: false, error: "Missing imageUrl." };

    const mediaType = d.mediaType || "image/png";
    let content;
    if (imageUrl.startsWith("data:") || imageUrl.startsWith("http")) {
      if (imageUrl.startsWith("data:")) {
        const base64Data = imageUrl.split(",")[1] || imageUrl;
        content = [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } },
          { type: "text", text: prompt }
        ];
      } else {
        content = [
          { type: "image", source: { type: "url", url: imageUrl } },
          { type: "text", text: prompt }
        ];
      }
    } else {
      content = [
        { type: "image", source: { type: "base64", media_type: mediaType, data: imageUrl } },
        { type: "text", text: prompt }
      ];
    }

    const messages = [{ role: "user", content }];
    const body = { model, max_tokens: maxTokens, messages };
    if (system) body.system = system;
    if (temperature != null) body.temperature = temperature;

    log('Analyse de l\'image...');
    const res = await utils.anthropicRequest(opts, "/messages", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = utils.normalizeMessageResponse(res.data);
    return {
      ok: true,
      id: r.id,
      model: r.model,
      text: r.text || "",
      stopReason: r.stopReason,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens
    };
  }
};
