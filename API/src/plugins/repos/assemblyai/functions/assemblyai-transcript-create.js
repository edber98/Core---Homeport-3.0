const { utils } = require("./utils");
module.exports = { async assemblyai_transcript_create(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.audioUrl) return { ok: false, error: "URL audio requise." };
  let options;
  try { options = utils.parseJsonInput(d.options, "options", {}); } catch (e) { return { ok: false, error: e.message }; }
  const body = { ...options, audio_url: String(d.audioUrl) };
  if (d.languageCode) body.language_code = String(d.languageCode);
  const res = await utils.assemblyaiRequest(opts, "/transcript", { method: "POST", body });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: res.data?.id || "", status: res.data?.status || "", url: res.data?.audio_url || d.audioUrl, text: res.data?.text || "", result_json: utils.compactJson(res.data) };
} };
