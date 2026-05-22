const { utils } = require("./utils");
module.exports = { async qdrant_collection_create(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.collectionName) return { ok: false, error: "Collection requise." };
  const size = parseInt(d.size, 10);
  if (!size) return { ok: false, error: "Dimensions requises." };
  const body = { vectors: { size, distance: d.distance || "Cosine" } };
  const res = await utils.qdrantRequest(opts, `/collections/${encodeURIComponent(String(d.collectionName))}`, { method: "PUT", body });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: String(d.collectionName), status: res.data?.status || "created", name: String(d.collectionName), result_json: utils.compactJson(res.data) };
} };
