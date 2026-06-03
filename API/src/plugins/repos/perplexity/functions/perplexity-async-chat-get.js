const { utils } = require("./utils");
module.exports = { async perplexity_async_chat_get(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.requestId) return { ok: false, error: "ID requête requis." };
  const res = await utils.perplexityRequest(opts, `/async/chat/completions/${encodeURIComponent(String(d.requestId))}`);
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: res.data?.id || d.requestId, status: res.data?.status || "", text: utils.firstTextFromChoices(res.data), result_json: utils.compactJson(res.data) };
} };
