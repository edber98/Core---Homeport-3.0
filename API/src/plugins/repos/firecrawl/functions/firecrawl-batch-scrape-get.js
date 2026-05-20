const { utils } = require("./utils");
module.exports = { async firecrawl_batch_scrape_get(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.jobId) return { ok: false, error: "ID job requis." };
  const res = await utils.firecrawlRequest(opts, `/v2/batch/scrape/${encodeURIComponent(String(d.jobId))}`);
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: d.jobId, status: res.data?.status || "", text: utils.compactJson(res.data?.data || []), result_json: utils.compactJson(res.data) };
} };
