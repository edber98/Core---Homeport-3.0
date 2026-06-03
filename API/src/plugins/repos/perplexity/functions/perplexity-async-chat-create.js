const { utils } = require("./utils");
module.exports = { async perplexity_async_chat_create(node, msg, inputs, opts) {
  const d = inputs || {};
  const prompt = String(d.prompt || "").trim();
  if (!prompt) return { ok: false, error: "Prompt requis." };
  let messages;
  try {
    const parsed = utils.parseJsonInput(d.messages, "messages", null);
    messages = Array.isArray(parsed) && parsed.length ? parsed : [{ role: "user", content: prompt }];
  } catch (e) { return { ok: false, error: e.message }; }
  const body = { model: d.model || "sonar-deep-research", messages };
  if (d.maxTokens) body.max_tokens = parseInt(d.maxTokens, 10);
  const res = await utils.perplexityRequest(opts, "/async/chat/completions", { method: "POST", body });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: res.data?.id || res.data?.request_id || "", status: res.data?.status || "queued", name: body.model, result_json: utils.compactJson(res.data) };
} };
