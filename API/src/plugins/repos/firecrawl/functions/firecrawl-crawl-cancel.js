const { utils } = require("./utils");
module.exports = { async firecrawl_crawl_cancel(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.crawlId) return { ok: false, error: "ID du crawl requis." };
  const res = await utils.firecrawlRequest(opts, `/v2/crawl/${encodeURIComponent(String(d.crawlId))}/cancel`, { method: "POST", body: {} });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: d.crawlId, status: "cancelled", result_json: utils.compactJson(res.data) };
} };
