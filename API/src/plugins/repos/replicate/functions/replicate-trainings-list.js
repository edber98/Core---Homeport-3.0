const { utils } = require("./utils");
module.exports = { async replicate_trainings_list(node, msg, inputs, opts) {
  const d = inputs || {};
  const res = await utils.replicateRequest(opts, "/trainings", { query: { cursor: d.cursor || "" } });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const items = Array.isArray(res.data?.results) ? res.data.results : [];
  return { ok: true, totalCount: items.length, nextCursor: res.data?.next || "", items: items.map((r) => ({ id: r.id || "", name: r.model || "", status: r.status || "", url: r.urls?.get || "", result_json: utils.compactJson(r) })) };
} };
