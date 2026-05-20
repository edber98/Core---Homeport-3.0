const { utils } = require("./utils");
module.exports = { async assemblyai_transcript_subtitles_get(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.transcriptId) return { ok: false, error: "ID transcription requis." };
  const format = String(d.format || "srt").toLowerCase() === "vtt" ? "vtt" : "srt";
  const res = await utils.assemblyaiRequest(opts, `/transcript/${encodeURIComponent(String(d.transcriptId))}/${format}`);
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const text = typeof res.data === "string" ? res.data : utils.compactJson(res.data);
  return { ok: true, id: d.transcriptId, status: format, text, result_json: utils.compactJson({ format, text }) };
} };
