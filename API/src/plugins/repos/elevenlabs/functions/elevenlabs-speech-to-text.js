const { utils } = require("./utils");
async function fetchBlob(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Téléchargement impossible: HTTP ${res.status}`);
  const type = res.headers.get("content-type") || "application/octet-stream";
  return new Blob([await res.arrayBuffer()], { type });
}
module.exports = { async elevenlabs_speech_to_text(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.fileUrl) return { ok: false, error: "URL fichier requise." };
  const form = new FormData();
  try { form.append("file", await fetchBlob(String(d.fileUrl)), "audio"); } catch (e) { return { ok: false, error: e.message }; }
  form.append("model_id", String(d.modelId || "scribe_v1"));
  if (d.languageCode) form.append("language_code", String(d.languageCode));
  if (d.tagAudioEvents) form.append("tag_audio_events", String(d.tagAudioEvents));
  if (d.diarize) form.append("diarize", String(d.diarize));
  const res = await utils.elevenlabsRequest(opts, "/speech-to-text", { method: "POST", formData: form });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, status: "transcribed", name: d.modelId || "scribe_v1", url: d.fileUrl, text: res.data?.text || "", result_json: utils.compactJson(res.data) };
} };
