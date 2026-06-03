const { utils } = require("./utils");
module.exports = { async elevenlabs_voice_get(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.voiceId) return { ok: false, error: "ID voix requis." };
  const res = await utils.elevenlabsRequest(opts, `/voices/${encodeURIComponent(String(d.voiceId))}`);
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: res.data?.voice_id || d.voiceId, status: res.data?.category || "", name: res.data?.name || "", result_json: utils.compactJson(res.data) };
} };
