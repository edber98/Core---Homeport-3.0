const { utils } = require("./utils");
module.exports = { async assemblyai_transcript_get(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.transcriptId) return { ok: false, error: "ID transcription requis." };
  const res = await utils.assemblyaiRequest(opts, `/transcript/${encodeURIComponent(String(d.transcriptId))}`);
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: res.data?.id || "", status: res.data?.status || "", url: res.data?.audio_url || "", text: res.data?.text || "", result_json: utils.compactJson(res.data) };
} };
