const { utils } = require("./utils");
module.exports = { async elevenlabs_models_list(node, msg, inputs, opts) {
  const res = await utils.elevenlabsRequest(opts, "/models");
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const rawItems = Array.isArray(res.data) ? res.data : [];
  const items = rawItems.map((r) => ({ id: r.model_id || "", name: r.name || r.model_id || "", status: r.can_do_text_to_speech ? "tts" : "", result_json: utils.compactJson(r) }));
  return { ok: true, items, totalCount: items.length, nextCursor: "" };
} };
