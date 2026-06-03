const { utils } = require("./utils");
module.exports = { async elevenlabs_text_to_speech(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.voiceId) return { ok: false, error: "ID voix requis." };
  if (!d.text) return { ok: false, error: "Texte requis." };
  let voiceSettings;
  try { voiceSettings = utils.parseJsonInput(d.voiceSettings, "paramètres voix", undefined); } catch (e) { return { ok: false, error: e.message }; }
  const body = { text: String(d.text), model_id: d.modelId || "eleven_multilingual_v2" };
  if (voiceSettings) body.voice_settings = voiceSettings;
  const res = await utils.elevenlabsRequest(opts, `/text-to-speech/${encodeURIComponent(String(d.voiceId))}`, { method: "POST", body, responseType: "arrayBuffer", headers: { Accept: "audio/mpeg" } });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: String(d.voiceId), status: "generated", name: body.model_id, text: res.data.toString("base64"), result_json: utils.compactJson({ contentType: res.headers.get("content-type") || "audio/mpeg", encoding: "base64", bytes: res.data.length }) };
} };
