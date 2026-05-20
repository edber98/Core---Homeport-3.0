const { utils } = require("./utils");
module.exports = { async groq_audio_transcribe(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.audioUrl) return { ok: false, error: "URL audio requise." };
  const form = new FormData();
  form.append("url", String(d.audioUrl));
  form.append("model", String(d.model || "whisper-large-v3"));
  if (d.language) form.append("language", String(d.language));
  if (d.prompt) form.append("prompt", String(d.prompt));
  if (d.responseFormat) form.append("response_format", String(d.responseFormat));
  if (d.temperature !== undefined && d.temperature !== "") form.append("temperature", String(d.temperature));
  const res = await utils.groqRequest(opts, "/audio/transcriptions", { method: "POST", formData: form });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const text = typeof res.data === "string" ? res.data : res.data?.text || "";
  return { ok: true, id: res.data?.x_groq?.id || "", status: "transcribed", name: d.model || "whisper-large-v3", url: d.audioUrl, text, result_json: utils.compactJson(res.data) };
} };
