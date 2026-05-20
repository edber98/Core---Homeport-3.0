const { utils } = require("./utils");
module.exports = { async assemblyai_transcript_sentences_get(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.transcriptId) return { ok: false, error: "ID transcription requis." };
  const res = await utils.assemblyaiRequest(opts, `/transcript/${encodeURIComponent(String(d.transcriptId))}/sentences`);
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: d.transcriptId, status: "sentences", text: (res.data?.sentences || []).map((s) => s.text).join("\n"), result_json: utils.compactJson(res.data) };
} };
