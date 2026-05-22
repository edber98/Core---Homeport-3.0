const { utils } = require("./utils");
module.exports = { async qdrant_points_delete(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.collectionName) return { ok: false, error: "Collection requise." };
  let ids, filter;
  try { ids = utils.parseJsonInput(d.ids, "IDs", undefined); filter = utils.parseJsonInput(d.filter, "filtre", undefined); } catch (e) { return { ok: false, error: e.message }; }
  if ((!Array.isArray(ids) || !ids.length) && !filter) return { ok: false, error: "IDs JSON ou filtre requis." };
  const points = Array.isArray(ids) && ids.length ? ids : { filter };
  const res = await utils.qdrantRequest(opts, `/collections/${encodeURIComponent(String(d.collectionName))}/points/delete`, { method: "POST", body: { points } });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: d.collectionName, status: res.data?.status || "deleted", result_json: utils.compactJson(res.data) };
} };
