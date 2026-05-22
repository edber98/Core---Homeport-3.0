const { utils } = require("./utils");
module.exports = { async firecrawl_crawl_get(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.crawlId) return { ok: false, error: "ID du crawl requis." };
  const res = await utils.firecrawlRequest(opts, `/v2/crawl/${encodeURIComponent(String(d.crawlId))}`);
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: String(d.crawlId), status: res.data?.status || "", text: res.data?.status || "", result_json: utils.compactJson(res.data) };
} };
