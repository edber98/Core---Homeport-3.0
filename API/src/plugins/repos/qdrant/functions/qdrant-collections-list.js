const { utils } = require("./utils");
module.exports = { async qdrant_collections_list(node, msg, inputs, opts) {
  const res = await utils.qdrantRequest(opts, "/collections");
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const rawItems = res.data?.result?.collections || [];
  const items = rawItems.map((r) => ({ id: r.name || "", name: r.name || "", result_json: utils.compactJson(r) }));
  return { ok: true, items, totalCount: items.length, nextCursor: "" };
} };
