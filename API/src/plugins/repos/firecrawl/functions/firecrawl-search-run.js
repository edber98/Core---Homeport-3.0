const { utils } = require("./utils");
function itemFromUnknown(value, index = 0) { const r = value || {}; return { id: String(r.id || r.key || r.url || index), name: r.name || r.title || r.model || r.url || "", status: r.status || r.state || "", url: r.url || r.link || "", result_json: utils.compactJson(r) }; }
module.exports = { async firecrawl_search_run(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.searchQuery) return { ok: false, error: "Requête requise." };
  const body = { query: String(d.searchQuery) };
  utils.addNumber(body, "limit", d.limit);
  utils.addValue(body, "tbs", d.tbs);
  try {
    utils.addJson(body, "sources", d.sources, "sources");
    utils.addJson(body, "categories", d.categories, "categories");
    utils.addJson(body, "location", d.location, "location");
    utils.addJson(body, "scrapeOptions", d.scrapeOptions, "scrapeOptions");
  } catch (e) { return { ok: false, error: e.message }; }
  const res = await utils.firecrawlRequest(opts, "/v2/search", { method: "POST", body });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const rawItems = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data?.results) ? res.data.results : [];
  const items = rawItems.map(itemFromUnknown);
  return { ok: true, items, totalCount: items.length, nextCursor: "" };
} };
