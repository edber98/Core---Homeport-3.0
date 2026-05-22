const { utils } = require("./utils");
module.exports = { async serpapi_search_results_list(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.query) return { ok: false, error: "Requête requise." };
  const res = await utils.serpapiRequest(opts, "/search.json", { query: { q: d.query, engine: d.engine || "google", num: d.num } });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const rawItems = Array.isArray(res.data?.organic_results) ? res.data.organic_results : [];
  const items = rawItems.map((r) => ({ id: String(r.position || r.link || ""), name: r.title || "", url: r.link || "", text: r.snippet || "", result_json: utils.compactJson(r) }));
  return { ok: true, items, totalCount: items.length, nextCursor: "" };
} };
