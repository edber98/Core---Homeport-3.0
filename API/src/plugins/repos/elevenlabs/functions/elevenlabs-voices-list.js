const { utils } = require("./utils");
module.exports = { async elevenlabs_voices_list(node, msg, inputs, opts) {
  const res = await utils.elevenlabsRequest(opts, "/voices");
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const rawItems = Array.isArray(res.data?.voices) ? res.data.voices : [];
  const items = rawItems.map((r) => ({ id: r.voice_id || "", name: r.name || "", status: r.category || "", result_json: utils.compactJson(r) }));
  return { ok: true, items, totalCount: items.length, nextCursor: "" };
} };
