const { utils } = require("./utils");
module.exports = { async replicate_predictions_list(node, msg, inputs, opts) {
  const d = inputs || {};
  const res = await utils.replicateRequest(opts, "/predictions", { query: { cursor: d.cursor } });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const rawItems = Array.isArray(res.data?.results) ? res.data.results : [];
  const items = rawItems.map((r) => ({ id: r.id || "", status: r.status || "", url: r.urls?.get || "", result_json: utils.compactJson(r) }));
  return { ok: true, items, totalCount: items.length, nextCursor: res.data?.next || "" };
} };
