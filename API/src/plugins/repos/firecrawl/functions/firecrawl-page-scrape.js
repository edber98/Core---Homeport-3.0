const { utils } = require("./utils");
module.exports = { async firecrawl_page_scrape(node, msg, inputs, opts) {
  const log = (opts && opts.log) ? opts.log : () => {};
  const d = inputs || {};
  if (!d.url) return { ok: false, error: "URL requise." };
  const body = { url: String(d.url) };
  try {
    utils.addJson(body, "formats", d.formats, "formats");
    utils.addJson(body, "includeTags", d.includeTags, "includeTags");
    utils.addJson(body, "excludeTags", d.excludeTags, "excludeTags");
    utils.addJson(body, "headers", d.requestHeaders, "requestHeaders");
    utils.addJson(body, "parsers", d.parsers, "parsers");
    utils.addJson(body, "actions", d.actions, "actions");
    utils.addJson(body, "location", d.location, "location");
  } catch (e) { return { ok: false, error: e.message }; }
  utils.addBoolean(body, "onlyMainContent", d.onlyMainContent);
  utils.addBoolean(body, "mobile", d.mobile);
  utils.addBoolean(body, "skipTlsVerification", d.skipTlsVerification);
  utils.addBoolean(body, "removeBase64Images", d.removeBase64Images);
  utils.addBoolean(body, "blockAds", d.blockAds);
  utils.addNumber(body, "maxAge", d.maxAge);
  utils.addNumber(body, "waitFor", d.waitFor);
  utils.addNumber(body, "timeout", d.timeout);
  if (!body.formats) body.formats = ["markdown"];
  log("Scraping en cours...");
  const res = await utils.firecrawlRequest(opts, "/v2/scrape", { method: "POST", body });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const data = res.data?.data || res.data || {};
  return { ok: true, id: data.id || "", status: res.data?.success === false ? "failed" : "completed", name: data.metadata?.title || "", url: data.metadata?.sourceURL || d.url, text: data.markdown || data.text || "", result_json: utils.compactJson(data) };
} };
