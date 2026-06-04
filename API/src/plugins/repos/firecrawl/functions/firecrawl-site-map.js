const { utils } = require("./utils");
module.exports = { async firecrawl_site_map(node, msg, inputs, opts) {
  const log = (opts && opts.log) ? opts.log : () => {};
  const d = inputs || {};
  if (!d.url) return { ok: false, error: "URL requise." };
  const body = { url: String(d.url) };
  utils.addValue(body, "search", d.search);
  utils.addValue(body, "sitemap", d.sitemap);
  utils.addBoolean(body, "includeSubdomains", d.includeSubdomains);
  utils.addBoolean(body, "ignoreQueryParameters", d.ignoreQueryParameters);
  utils.addNumber(body, "limit", d.limit);
  utils.addNumber(body, "timeout", d.timeout);
  try { utils.addJson(body, "location", d.location, "location"); } catch (e) { return { ok: false, error: e.message }; }
  log("Cartographie en cours...");
  const res = await utils.firecrawlRequest(opts, "/v2/map", { method: "POST", body });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const links = res.data?.links || res.data?.data || [];
  const items = (Array.isArray(links) ? links : []).map((item) => {
    const url = typeof item === "string" ? item : item.url;
    return { id: String(url || ""), name: String((item && item.title) || url || ""), url: String(url || ""), result_json: utils.compactJson(item) };
  });
  return { ok: true, items, totalCount: items.length, nextCursor: "" };
} };
