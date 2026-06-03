const { utils } = require("./utils");
module.exports = { async qdrant_points_upsert(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.collectionName) return { ok: false, error: "Collection requise." };
  let points;
  try { points = utils.parseJsonInput(d.points, "points", null); } catch (e) { return { ok: false, error: e.message }; }
  if (!Array.isArray(points) || !points.length) return { ok: false, error: "Points JSON requis." };
  const res = await utils.qdrantRequest(opts, `/collections/${encodeURIComponent(String(d.collectionName))}/points`, { method: "PUT", body: { points } });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: String(d.collectionName), status: res.data?.status || "upserted", text: String(points.length), result_json: utils.compactJson(res.data) };
} };
