const { utils } = require("./utils");
module.exports = { async qdrant_points_retrieve(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.collectionName) return { ok: false, error: "Collection requise." };
  let ids;
  try { ids = utils.parseJsonInput(d.ids, "IDs", null); } catch (e) { return { ok: false, error: e.message }; }
  if (!Array.isArray(ids) || !ids.length) return { ok: false, error: "IDs JSON requis." };
  const res = await utils.qdrantRequest(opts, `/collections/${encodeURIComponent(String(d.collectionName))}/points`, { method: "POST", body: { ids, with_payload: true, with_vector: true } });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const rawItems = Array.isArray(res.data?.result) ? res.data.result : [];
  const items = rawItems.map((r) => ({ id: String(r.id || ""), name: String(r.id || ""), result_json: utils.compactJson(r) }));
  return { ok: true, items, totalCount: items.length, nextCursor: "" };
} };
