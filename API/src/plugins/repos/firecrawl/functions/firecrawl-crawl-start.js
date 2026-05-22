const { utils } = require("./utils");
module.exports = { async firecrawl_crawl_start(node, msg, inputs, opts) {
  const log = (opts && opts.log) ? opts.log : () => {};
  const d = inputs || {};
  if (!d.url) return { ok: false, error: "URL requise." };
  let options;
  try { options = utils.parseJsonInput(d.options, "options", {}); } catch (e) { return { ok: false, error: e.message }; }
  const body = { ...options, url: String(d.url) };
  if (d.limit) body.limit = parseInt(d.limit, 10);
  log("Démarrage du crawl...");
  const res = await utils.firecrawlRequest(opts, "/v2/crawl", { method: "POST", body });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: res.data?.id || res.data?.jobId || "", status: res.data?.success === false ? "failed" : "started", url: d.url, result_json: utils.compactJson(res.data) };
} };
