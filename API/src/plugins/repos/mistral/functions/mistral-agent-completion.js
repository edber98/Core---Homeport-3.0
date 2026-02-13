const { utils } = require("./utils");

module.exports = {
  async mistral_agent_completion(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const agentId = (d.agentId || "").trim();
    if (!agentId) return { ok: false, error: "Missing agentId." };

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

    const body = { agent_id: agentId, messages };
    if (d.maxTokens) body.max_tokens = parseInt(d.maxTokens, 10);

    log('Envoi du prompt...');
    const res = await utils.mistralRequestStream(opts, "/agents/completions", { body }, (text) => log(text));
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      id: r.id,
      text: r.text || "",
      finishReason: r.finishReason,
      promptTokens: r.promptTokens,
      completionTokens: r.completionTokens
    };
  }
};
