const { utils } = require("./utils");
module.exports = { async pinecone_vectors_list(node, msg, inputs, opts) {
  const d = inputs || {};
  const res = await utils.pineconeRequest(opts, "/vectors/list", { query: { namespace: d.namespace, prefix: d.prefix, limit: d.limit, paginationToken: d.paginationToken } });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const rawItems = Array.isArray(res.data?.vectors) ? res.data.vectors : [];
  const items = rawItems.map((r) => ({ id: r.id || "", name: r.id || "", result_json: utils.compactJson(r) }));
  return { ok: true, items, totalCount: items.length, nextCursor: res.data?.pagination?.next || "" };
} };
