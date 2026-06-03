const { utils } = require("./utils");

module.exports = {
  async groq_chat_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const prompt = String(d.prompt || "").trim();
    if (!prompt) return { ok: false, error: "Prompt requis." };
    let messages;
    try {
      const parsed = utils.parseJsonInput(d.messages, "messages", null);
      messages = Array.isArray(parsed) && parsed.length ? parsed : [{ role: "user", content: prompt }];
    } catch (e) {
      return { ok: false, error: e.message };
    }
    const body = {
      model: String(d.model || "llama-3.3-70b-versatile").trim(),
      messages,
      temperature: d.temperature !== undefined && d.temperature !== "" ? Number(d.temperature) : 0.7,
      max_tokens: parseInt(d.maxTokens, 10) || 1024
    };
    if (d.responseFormat) body.response_format = { type: d.responseFormat };
    log("Envoi du prompt...");
    const res = await utils.groqRequest(opts, "/chat/completions", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return {
      ok: true,
      id: res.data?.id || "",
      status: res.data?.object || "",
      name: res.data?.model || body.model,
      text: utils.firstTextFromChoices(res.data),
      result_json: utils.compactJson(res.data)
    };
  }
};
