const { utils } = require("./utils");
module.exports = { async qdrant_collection_get(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.collectionName) return { ok: false, error: "Collection requise." };
  const res = await utils.qdrantRequest(opts, `/collections/${encodeURIComponent(String(d.collectionName))}`);
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: d.collectionName, status: res.data?.status || "", name: d.collectionName, result_json: utils.compactJson(res.data) };
} };
