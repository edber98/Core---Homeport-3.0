const { utils } = require("./utils");
module.exports = { async qdrant_points_search(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.collectionName) return { ok: false, error: "Collection requise." };
  let vector, filter;
  try { vector = utils.parseJsonInput(d.vector, "vecteur", null); filter = utils.parseJsonInput(d.filter, "filtre", undefined); } catch (e) { return { ok: false, error: e.message }; }
  if (!Array.isArray(vector)) return { ok: false, error: "Vecteur JSON requis." };
  const body = { vector, limit: parseInt(d.limit, 10) || 10, with_payload: true };
  if (filter) body.filter = filter;
  const res = await utils.qdrantRequest(opts, `/collections/${encodeURIComponent(String(d.collectionName))}/points/search`, { method: "POST", body });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const rawItems = Array.isArray(res.data?.result) ? res.data.result : [];
  const items = rawItems.map((r) => ({ id: String(r.id || ""), name: String(r.id || ""), status: r.score !== undefined ? String(r.score) : "", result_json: utils.compactJson(r) }));
  return { ok: true, items, totalCount: items.length, nextCursor: "" };
} };
