const { utils } = require("./utils");

module.exports = {
  async crisp_conversation_resolve(node, msg, inputs, opts) {
    const d = inputs || {};
    const websiteId = String(d.websiteId || "").trim();
    const sessionId = String(d.sessionId || "").trim();
    if (!websiteId) return { ok: false, error: "websiteId requis." };
    if (!sessionId) return { ok: false, error: "sessionId requis." };

    const body = { resolved: true };
    const res = await utils.crispRequest(opts, `/website/${encodeURIComponent(websiteId)}/conversation/${encodeURIComponent(sessionId)}/state`, { method: "PATCH", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: sessionId, status: "resolved", name: "", url: "", text: "Conversation résolue.", result_json: utils.compactJson(res.data) };
  }
};
