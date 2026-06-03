const { utils } = require("./utils");
module.exports = { async deepseek_chat_json(node, msg, inputs, opts) {
  const log = (opts && opts.log) ? opts.log : () => {};
  const d = inputs || {};
  const prompt = String(d.prompt || "").trim();
  if (!prompt) return { ok: false, error: "Prompt requis." };
  const schemaHint = d.schemaHint ? "\n\nJSON attendu: " + String(d.schemaHint) : "";
  const body = {
    model: String(d.model || "deepseek-chat").trim(),
    messages: [{ role: "user", content: prompt + schemaHint }],
    response_format: { type: "json_object" },
    max_tokens: parseInt(d.maxTokens, 10) || 1024,
    temperature: d.temperature !== undefined && d.temperature !== "" ? Number(d.temperature) : 0.2
  };
  log("Génération JSON...");
  const res = await utils.deepseekRequest(opts, "/chat/completions", { method: "POST", body });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const text = utils.firstTextFromChoices(res.data);
  return { ok: true, id: res.data?.id || "", status: res.data?.object || "", name: res.data?.model || body.model, text, result_json: utils.compactJson(res.data) };
} };
