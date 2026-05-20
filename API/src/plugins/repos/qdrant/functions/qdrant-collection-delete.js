const { utils } = require("./utils");
module.exports = { async qdrant_collection_delete(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.collectionName) return { ok: false, error: "Collection requise." };
  const res = await utils.qdrantRequest(opts, `/collections/${encodeURIComponent(String(d.collectionName))}`, { method: "DELETE" });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: d.collectionName, status: res.data?.status || "deleted", name: d.collectionName, result_json: utils.compactJson(res.data) };
} };
