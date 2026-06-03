const { utils } = require("./utils");

module.exports = {
  async openai_responses_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const model = String(d.model || "gpt-4o-mini");
    const input = String(d.input || "").trim();
    if (!input) return { ok: false, error: "Le champ input est requis." };

    const body = { model, input };
    if (d.instructions) body.instructions = String(d.instructions);
    if (d.temperature !== undefined && d.temperature !== null && d.temperature !== "") body.temperature = Number(d.temperature);
    if (d.maxOutputTokens !== undefined && d.maxOutputTokens !== null && d.maxOutputTokens !== "") body.max_output_tokens = Number(d.maxOutputTokens);

    const res = await utils.openaiRequest(opts, "/responses", body);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const text = String(res.data?.output_text || "");
    return {
      ok: true,
      id: String(res.data?.id || ""),
      text,
      json: JSON.stringify(res.data || {})
    };
  }
};
