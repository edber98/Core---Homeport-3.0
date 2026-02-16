const { utils } = require("./utils");

module.exports = {
  async anthropic_create_message_stream(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
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

    const body = { model, max_tokens: maxTokens, messages };
    if (system) body.system = system;
    if (temperature != null) body.temperature = temperature;

    log('Envoi du prompt...');
    const res = await utils.anthropicRequestStream(opts, "/messages", { body }, (text) => log(text));
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return { ok: true, text: res.data?.text || "", model: res.data?.model, stream: true };
  }
};
