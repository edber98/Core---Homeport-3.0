const { utils } = require("./utils");

module.exports = {
  async crisp_conversation_open(node, msg, inputs, opts) {
    const d = inputs || {};
    const websiteId = String(d.websiteId || "").trim();
    const sessionId = String(d.sessionId || "").trim();
    if (!websiteId) return { ok: false, error: "websiteId requis." };
    if (!sessionId) return { ok: false, error: "sessionId requis." };

    const res = await utils.crispRequest(opts, `/website/${encodeURIComponent(websiteId)}/conversation/${encodeURIComponent(sessionId)}/state`, {
      method: "PATCH",
      body: { resolved: false }
    });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: sessionId, status: "open", name: "", url: "", text: "Conversation rouverte.", result_json: utils.compactJson(res.data) };
  }
};
