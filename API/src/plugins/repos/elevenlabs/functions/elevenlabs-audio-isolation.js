const { utils } = require("./utils");

module.exports = {
  async elevenlabs_audio_isolation(node, msg, inputs, opts) {
    const d = inputs || {};
    const audioUrl = String(d.audioUrl || "").trim();
    if (!audioUrl) return { ok: false, error: "audioUrl requis." };

    const body = {
      audio: audioUrl,
      model_id: d.modelId ? String(d.modelId) : undefined,
      output_format: d.outputFormat ? String(d.outputFormat) : undefined
    };

    const res = await utils.elevenlabsRequest(opts, "/audio-isolation", { method: "POST", body, responseType: "arrayBuffer" });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    return {
      ok: true,
      id: "audio-isolation",
      status: "generated",
      name: body.model_id || "audio-isolation",
      result_json: utils.compactJson({
        contentType: String(res.headers?.get?.("content-type") || "audio/mpeg"),
        base64: res.data.toString("base64")
      })
    };
  }
};
