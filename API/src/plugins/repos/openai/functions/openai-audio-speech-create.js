const { utils } = require("./utils");

module.exports = {
  async openai_audio_speech_create(node, msg, inputs, opts) {
    const d = inputs || {};
    const input = String(d.input || "").trim();
    if (!input) return { ok: false, error: "Le champ input est requis." };

    const body = {
      model: String(d.model || "gpt-4o-mini-tts"),
      voice: String(d.voice || "alloy"),
      input,
      format: String(d.format || "mp3")
    };

    const res = await utils.openaiRequest(opts, "/audio/speech", body);
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const audioBase64 = String(res.data?.audio || "");
    let file = null;
    if (audioBase64 && opts && opts.files) {
      file = await opts.files.store(audioBase64, {
        name: `openai-tts.${body.format}`,
        mimeType: `audio/${body.format}`,
        lifecycle: "execution"
      });
    }

    return {
      ok: true,
      file,
      text: "",
      json: JSON.stringify(res.data || {})
    };
  }
};
