const { utils } = require("./utils");
module.exports = { async qdrant_points_scroll(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.collectionName) return { ok: false, error: "Collection requise." };
  let filter;
  try { filter = utils.parseJsonInput(d.filter, "filtre", undefined); } catch (e) { return { ok: false, error: e.message }; }
  const body = { limit: parseInt(d.limit, 10) || 10, with_payload: true, with_vector: false };
  if (filter) body.filter = filter;
  if (d.offset) body.offset = String(d.offset);
  const res = await utils.qdrantRequest(opts, `/collections/${encodeURIComponent(String(d.collectionName))}/points/scroll`, { method: "POST", body });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const rawItems = Array.isArray(res.data?.result?.points) ? res.data.result.points : [];
  const items = rawItems.map((r) => ({ id: String(r.id || ""), name: String(r.id || ""), result_json: utils.compactJson(r) }));
  return { ok: true, items, totalCount: items.length, nextCursor: res.data?.result?.next_page_offset || "" };
} };
