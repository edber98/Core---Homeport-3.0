const { utils } = require("./utils");

module.exports = {
  async openai_agent(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const creds = utils.credentials(opts);
    if (!creds.ok) return creds;

    const d = inputs || {};
    const model = String(d.model || creds.defaultModel || "gpt-4o-mini");
    const prompt = String(d.prompt || "").trim();
    if (!prompt) return { ok: false, error: "Le prompt est requis." };

    const incoming = (opts && opts.incoming && opts.incoming.byHandle) || {};
    const memories = Array.isArray(incoming.memory) ? incoming.memory : [];
    const tools = Array.isArray(incoming.tools) ? incoming.tools : [];
    const contexts = Array.isArray(incoming.context) ? incoming.context : [];
    const memoryText = memories.map((m) => Array.isArray(m?.texts) ? m.texts.join("\n") : m?.text || "").filter(Boolean).join("\n");
    const toolText = tools.map((t) => `- ${t?.name || t?.title || "tool"}: ${t?.description || ""}`).join("\n");
    const contextText = contexts.map((c) => typeof c === "string" ? c : JSON.stringify(c)).join("\n");

    const systemParts = [String(d.system || "").trim()];
    if (toolText) systemParts.push(`Outils disponibles:\n${toolText}`);
    if (memoryText) systemParts.push(`Mémoire:\n${memoryText}`);
    if (contextText) systemParts.push(`Contexte:\n${contextText}`);

    const messages = [];
    const system = systemParts.filter(Boolean).join("\n\n");
    if (system) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content: prompt });

    log("Envoi du prompt...");
    const res = await utils.openaiRequest(opts, "/chat/completions", {
      model,
      messages,
      temperature: d.temperature == null ? 0.7 : Number(d.temperature)
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, text: utils.contentText(res.data) };
  }
};
