const { utils } = require("./utils");
module.exports = { async assemblyai_transcript_paragraphs_get(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.transcriptId) return { ok: false, error: "ID transcription requis." };
  const res = await utils.assemblyaiRequest(opts, `/transcript/${encodeURIComponent(String(d.transcriptId))}/paragraphs`);
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: d.transcriptId, status: "paragraphs", text: (res.data?.paragraphs || []).map((p) => p.text).join("\n\n"), result_json: utils.compactJson(res.data) };
} };
