const { utils } = require("./utils");
module.exports = { async groq_batch_create(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.inputFileId) return { ok: false, error: "ID fichier requis." };
  const body = { input_file_id: String(d.inputFileId), endpoint: d.endpoint || "/v1/chat/completions", completion_window: d.completionWindow || "24h" };
  const res = await utils.groqRequest(opts, "/batches", { method: "POST", body });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: res.data?.id || "", status: res.data?.status || "", name: res.data?.endpoint || body.endpoint, result_json: utils.compactJson(res.data) };
} };
