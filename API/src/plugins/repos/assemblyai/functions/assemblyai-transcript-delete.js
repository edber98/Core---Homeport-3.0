const { utils } = require("./utils");
module.exports = { async assemblyai_transcript_delete(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.transcriptId) return { ok: false, error: "ID transcription requis." };
  const res = await utils.assemblyaiRequest(opts, `/transcript/${encodeURIComponent(String(d.transcriptId))}`, { method: "DELETE" });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: d.transcriptId, status: "deleted", result_json: utils.compactJson(res.data) };
} };
