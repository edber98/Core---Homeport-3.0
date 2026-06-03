const { utils } = require("./utils");
module.exports = { async pinecone_vectors_query(node, msg, inputs, opts) {
  const d = inputs || {};
  let vector, filter;
  try { vector = utils.parseJsonInput(d.vector, "vecteur", null); filter = utils.parseJsonInput(d.filter, "filtre", undefined); } catch (e) { return { ok: false, error: e.message }; }
  if (!Array.isArray(vector)) return { ok: false, error: "Vecteur JSON requis." };
  const body = { vector, topK: parseInt(d.topK, 10) || 10, includeMetadata: true };
  if (d.namespace) body.namespace = String(d.namespace);
  if (filter) body.filter = filter;
  const res = await utils.pineconeRequest(opts, "/query", { method: "POST", body });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const rawItems = Array.isArray(res.data?.matches) ? res.data.matches : [];
  const items = rawItems.map((r) => ({ id: r.id || "", name: r.id || "", status: r.score !== undefined ? String(r.score) : "", result_json: utils.compactJson(r) }));
  return { ok: true, items, totalCount: items.length, nextCursor: "" };
} };
