const { utils } = require("./utils");

module.exports = {
  async openai_audio_transcription_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const model = String(d.model || "gpt-4o-mini-transcribe");
    const text = String(d.audioBase64 || "").trim();
    if (!text) return { ok: false, error: "audioBase64 est requis." };

    const body = {
      model,
      input_audio: {
        data: text,
        format: String(d.format || "wav")
      }
    };

    const res = await utils.openaiRequest(opts, "/audio/transcriptions", body);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      id: String(res.data?.id || ""),
      text: String(res.data?.text || ""),
      json: JSON.stringify(res.data || {})
    };
  }
};
