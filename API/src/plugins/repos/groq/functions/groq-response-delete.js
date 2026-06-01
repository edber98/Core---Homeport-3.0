const { utils } = require("./utils");

module.exports = {
  async groq_response_delete(node, msg, inputs, opts) {
    const d = inputs || {};
    const responseId = String(d.responseId || "").trim();
    if (!responseId) return { ok: false, error: "responseId requis." };
    const res = await utils.groqRequest(opts, `/responses/${encodeURIComponent(responseId)}`, { method: "DELETE" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: responseId, status: res.data?.object || "deleted", name: "", text: "Réponse supprimée", result_json: utils.compactJson(res.data) };
  }
};
