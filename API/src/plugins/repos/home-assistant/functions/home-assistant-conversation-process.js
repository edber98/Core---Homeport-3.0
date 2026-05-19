const { utils } = require("./utils");

module.exports = {
  async home_assistant_conversation_process(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    const text = String(d.text || "").trim();
    if (!text) return { ok: false, error: "Texte requis." };

    const body = { text };
    if (d.language) body.language = String(d.language).trim();
    if (d.agentId) body.agent_id = String(d.agentId).trim();
    if (d.conversationId) body.conversation_id = String(d.conversationId).trim();

    log("Traitement de la conversation...");
    const res = await utils.homeAssistantRequest(opts, "/api/conversation/process", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    const data = res.data || {};
    return {
      ok: true,
      conversation_id: data.conversation_id || data.response?.conversation_id || "",
      response_text: data.response?.speech?.plain?.speech || data.response?.speech?.plain || data.speech || "",
      response: data
    };
  }
};
