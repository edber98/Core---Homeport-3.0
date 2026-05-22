const { utils } = require("./utils");
module.exports = { async assemblyai_lemur_task_create(node, msg, inputs, opts) {
  const d = inputs || {};
  let transcriptIds;
  try { transcriptIds = utils.parseJsonInput(d.transcriptIds, "IDs", null); } catch (e) { return { ok: false, error: e.message }; }
  if (!Array.isArray(transcriptIds) || !transcriptIds.length) return { ok: false, error: "IDs JSON requis." };
  if (!d.prompt) return { ok: false, error: "Prompt requis." };
  const body = { transcript_ids: transcriptIds, prompt: String(d.prompt), final_model: d.model || "anthropic/claude-3-5-sonnet", context: d.context || undefined };
  const res = await utils.assemblyaiRequest(opts, "/lemur/v3/generate/task", { method: "POST", body });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: res.data?.request_id || "", status: "completed", text: res.data?.response || "", result_json: utils.compactJson(res.data) };
} };
