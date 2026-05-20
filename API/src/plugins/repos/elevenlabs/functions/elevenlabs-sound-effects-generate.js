const { utils } = require("./utils");
module.exports = { async elevenlabs_sound_effects_generate(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.text) return { ok: false, error: "Description requise." };
  const body = { text: String(d.text) };
  if (d.durationSeconds) body.duration_seconds = Number(d.durationSeconds);
  if (d.promptInfluence) body.prompt_influence = Number(d.promptInfluence);
  const res = await utils.elevenlabsRequest(opts, "/sound-generation", { method: "POST", body, responseType: "arrayBuffer" });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, status: "generated", text: res.data.toString("base64"), result_json: utils.compactJson({ encoding: "base64", bytes: res.data.length }) };
} };
