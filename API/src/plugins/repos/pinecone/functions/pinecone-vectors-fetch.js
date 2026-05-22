const { utils } = require("./utils");
module.exports = { async pinecone_vectors_fetch(node, msg, inputs, opts) {
  const d = inputs || {};
  let ids;
  try { ids = utils.parseJsonInput(d.ids, "IDs", null); } catch (e) { return { ok: false, error: e.message }; }
  if (!Array.isArray(ids) || !ids.length) return { ok: false, error: "IDs JSON requis." };
  const res = await utils.pineconeRequest(opts, "/vectors/fetch", { query: { namespace: d.namespace, ids } });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const entries = Object.entries(res.data?.vectors || {});
  const items = entries.map(([id, r]) => ({ id, name: id, result_json: utils.compactJson(r) }));
  return { ok: true, items, totalCount: items.length, nextCursor: "" };
} };
