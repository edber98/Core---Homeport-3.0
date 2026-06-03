const { utils } = require("./utils");
module.exports = { async firecrawl_batch_scrape_start(node, msg, inputs, opts) {
  const d = inputs || {};
  let urls, options;
  try { urls = utils.parseJsonInput(d.urls, "URLs", null); options = utils.parseJsonInput(d.options, "options", {}); } catch (e) { return { ok: false, error: e.message }; }
  if (!Array.isArray(urls) || !urls.length) return { ok: false, error: "URLs JSON requises." };
  const res = await utils.firecrawlRequest(opts, "/v2/batch/scrape", { method: "POST", body: { ...options, urls } });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: res.data?.id || res.data?.jobId || "", status: res.data?.success === false ? "failed" : "started", result_json: utils.compactJson(res.data) };
} };
