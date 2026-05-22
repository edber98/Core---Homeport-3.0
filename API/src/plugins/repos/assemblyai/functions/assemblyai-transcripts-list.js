const { utils } = require("./utils");
module.exports = { async assemblyai_transcripts_list(node, msg, inputs, opts) {
  const d = inputs || {};
  const res = await utils.assemblyaiRequest(opts, "/transcript", { query: { limit: d.limit || 20, status: d.status } });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const rawItems = Array.isArray(res.data?.transcripts) ? res.data.transcripts : [];
  const items = rawItems.map((r) => ({ id: r.id || "", status: r.status || "", url: r.audio_url || "", text: r.text || "", result_json: utils.compactJson(r) }));
  return { ok: true, items, totalCount: items.length, nextCursor: res.data?.page_details?.next_url || "" };
} };
