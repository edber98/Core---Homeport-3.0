const { utils } = require("./utils");
module.exports = { async firecrawl_page_scrape(node, msg, inputs, opts) {
  const log = (opts && opts.log) ? opts.log : () => {};
  const d = inputs || {};
  if (!d.url) return { ok: false, error: "URL requise." };
  let options, formats;
  try { options = utils.parseJsonInput(d.options, "options", {}); formats = utils.parseJsonInput(d.formats, "formats", ["markdown"]); } catch (e) { return { ok: false, error: e.message }; }
  const body = { ...options, url: String(d.url), formats };
  log("Scraping en cours...");
  const res = await utils.firecrawlRequest(opts, "/v2/scrape", { method: "POST", body });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const data = res.data?.data || res.data || {};
  return { ok: true, id: data.id || "", status: res.data?.success === false ? "failed" : "completed", name: data.metadata?.title || "", url: data.metadata?.sourceURL || d.url, text: data.markdown || data.text || "", result_json: utils.compactJson(data) };
} };
