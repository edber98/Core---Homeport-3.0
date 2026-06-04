const { utils } = require("./utils");

module.exports = {
  async groq_response_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const input = String(d.responseInput || "").trim();
    if (!input) return { ok: false, error: "responseInput requis." };
    const body = { model: String(d.model || "openai/gpt-oss-20b").trim(), input };
    const res = await utils.groqRequest(opts, "/responses", { method: "POST", body });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
    return { ok: true, id: res.data?.id || "", status: res.data?.status || res.data?.object || "", name: body.model, text: res.data?.output_text || "", result_json: utils.compactJson(res.data) };
  }
};
