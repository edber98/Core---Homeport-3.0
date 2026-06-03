const { utils } = require("./utils");
module.exports = { async cohere_chat_create(node, msg, inputs, opts) {
  const log = (opts && opts.log) ? opts.log : () => {};
  const d = inputs || {};
  const prompt = String(d.prompt || "").trim();
  if (!prompt) return { ok: false, error: "Prompt requis." };
  let messages;
  try { messages = utils.parseJsonInput(d.messages, "messages", [{ role: "user", content: prompt }]); } catch (e) { return { ok: false, error: e.message }; }
  const body = { model: String(d.model || "command-a-03-2025").trim(), messages };
  if (d.temperature !== undefined && d.temperature !== "") body.temperature = Number(d.temperature);
  if (d.maxTokens) body.max_tokens = parseInt(d.maxTokens, 10);
  log("Envoi du message...");
  const res = await utils.cohereRequest(opts, "/v2/chat", { method: "POST", body });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const content = Array.isArray(res.data?.message?.content) ? res.data.message.content : [];
  const text = content.map((part) => part.text || "").join("");
  return { ok: true, id: res.data?.id || "", status: res.data?.finish_reason || "", name: body.model, text, result_json: utils.compactJson(res.data) };
} };
