const { utils } = require("./utils");

module.exports = {
  async groq_response_get(node, msg, inputs, opts) {
    const d = inputs || {};
    const responseId = String(d.responseId || "").trim();
    if (!responseId) return { ok: false, error: "responseId requis." };
    const res = await utils.groqRequest(opts, `/responses/${encodeURIComponent(responseId)}`, { method: "GET" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: res.data?.id || responseId, status: res.data?.status || "", name: res.data?.model || "", text: res.data?.output_text || "", result_json: utils.compactJson(res.data) };
  }
};
