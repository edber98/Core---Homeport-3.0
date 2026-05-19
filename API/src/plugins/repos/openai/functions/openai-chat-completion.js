const { utils } = require("./utils");

module.exports = {
  async openai_chat_completion(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const creds = utils.credentials(opts);
    if (!creds.ok) return creds;

    const d = inputs || {};
    const model = String(d.model || creds.defaultModel || "gpt-4o-mini");
    const prompt = String(d.prompt || "").trim();
    const system = String(d.system || "").trim();
    if (!prompt) return { ok: false, error: "Le prompt est requis." };

    const messages = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content: prompt });

    const body = { model, messages, temperature: d.temperature == null ? 0.7 : Number(d.temperature) };
    if (d.maxTokens != null && d.maxTokens !== "") body.max_tokens = Number(d.maxTokens);

    log("Envoi du prompt...");
    const res = await utils.openaiRequest(opts, "/chat/completions", body);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, text: utils.contentText(res.data) };
  }
};
