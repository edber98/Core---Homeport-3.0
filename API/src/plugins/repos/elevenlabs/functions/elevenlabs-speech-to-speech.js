const { utils } = require("./utils");
async function fetchBlob(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Téléchargement impossible: HTTP ${res.status}`);
  const type = res.headers.get("content-type") || "application/octet-stream";
  return new Blob([await res.arrayBuffer()], { type });
}
module.exports = { async elevenlabs_speech_to_speech(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.voiceId) return { ok: false, error: "ID voix requis." };
  if (!d.fileUrl) return { ok: false, error: "URL fichier requise." };
  let voiceSettings;
  try { voiceSettings = utils.parseJsonInput(d.voiceSettings, "paramètres voix", undefined); } catch (e) { return { ok: false, error: e.message }; }
  const form = new FormData();
  try { form.append("audio", await fetchBlob(String(d.fileUrl)), "audio"); } catch (e) { return { ok: false, error: e.message }; }
  if (d.modelId) form.append("model_id", String(d.modelId));
  if (voiceSettings) form.append("voice_settings", JSON.stringify(voiceSettings));
  const res = await utils.elevenlabsRequest(opts, `/speech-to-speech/${encodeURIComponent(String(d.voiceId))}`, { method: "POST", formData: form, responseType: "arrayBuffer" });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: d.voiceId, status: "generated", text: res.data.toString("base64"), result_json: utils.compactJson({ encoding: "base64", bytes: res.data.length }) };
} };
