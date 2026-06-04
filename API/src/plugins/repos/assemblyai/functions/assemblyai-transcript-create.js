const { utils } = require("./utils");
module.exports = { async assemblyai_transcript_create(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.audioUrl) return { ok: false, error: "URL audio requise." };
  const body = { audio_url: String(d.audioUrl) };
  if (d.languageCode) body.language_code = String(d.languageCode);
  if (d.speakerLabels !== undefined) body.speaker_labels = Boolean(d.speakerLabels);
  if (d.autoChapters !== undefined) body.auto_chapters = Boolean(d.autoChapters);
  if (d.entityDetection !== undefined) body.entity_detection = Boolean(d.entityDetection);
  if (d.sentimentAnalysis !== undefined) body.sentiment_analysis = Boolean(d.sentimentAnalysis);
  if (d.webhookUrl) body.webhook_url = String(d.webhookUrl);
  const res = await utils.assemblyaiRequest(opts, "/transcript", { method: "POST", body });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: res.data?.id || "", status: res.data?.status || "", url: res.data?.audio_url || d.audioUrl, text: res.data?.text || "", result_json: utils.compactJson(res.data) };
} };
