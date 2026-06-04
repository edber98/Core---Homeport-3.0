const { utils } = require("./utils");
module.exports = { async firecrawl_batch_scrape_start(node, msg, inputs, opts) {
  const d = inputs || {};
  let urls;
  try { urls = utils.parseJsonInput(d.urls, "URLs", null); } catch (e) { return { ok: false, error: e.message }; }
  if (!Array.isArray(urls) || !urls.length) return { ok: false, error: "URLs JSON requises." };
  const body = { urls };
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
  const res = await utils.firecrawlRequest(opts, "/v2/batch/scrape", { method: "POST", body });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: res.data?.id || res.data?.jobId || "", status: res.data?.success === false ? "failed" : "started", result_json: utils.compactJson(res.data) };
} };
