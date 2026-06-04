const { utils } = require("./utils");
module.exports = { async firecrawl_crawl_start(node, msg, inputs, opts) {
  const log = (opts && opts.log) ? opts.log : () => {};
  const d = inputs || {};
  if (!d.url) return { ok: false, error: "URL requise." };
  const body = { url: String(d.url) };
  utils.addNumber(body, "limit", d.limit);
  utils.addNumber(body, "maxDiscoveryDepth", d.maxDiscoveryDepth);
  utils.addBoolean(body, "allowBackwardLinks", d.allowBackwardLinks);
  utils.addBoolean(body, "allowExternalLinks", d.allowExternalLinks);
  utils.addBoolean(body, "ignoreSitemap", d.ignoreSitemap);
  utils.addValue(body, "webhook", d.webhook);
  try {
    utils.addJson(body, "includePaths", d.includePaths, "includePaths");
    utils.addJson(body, "excludePaths", d.excludePaths, "excludePaths");
    utils.addJson(body, "scrapeOptions", d.scrapeOptions, "scrapeOptions");
  } catch (e) { return { ok: false, error: e.message }; }
  log("Démarrage du crawl...");
  const res = await utils.firecrawlRequest(opts, "/v2/crawl", { method: "POST", body });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: res.data?.id || res.data?.jobId || "", status: res.data?.success === false ? "failed" : "started", url: d.url, result_json: utils.compactJson(res.data) };
} };
