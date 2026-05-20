const { utils } = require("./utils");
module.exports = { async firecrawl_site_map(node, msg, inputs, opts) {
  const log = (opts && opts.log) ? opts.log : () => {};
  const d = inputs || {};
  if (!d.url) return { ok: false, error: "URL requise." };
  let options;
  try { options = utils.parseJsonInput(d.options, "options", {}); } catch (e) { return { ok: false, error: e.message }; }
  const body = { ...options, url: String(d.url) };
  if (d.limit) body.limit = parseInt(d.limit, 10);
  log("Cartographie en cours...");
  const res = await utils.firecrawlRequest(opts, "/v2/map", { method: "POST", body });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const links = res.data?.links || res.data?.data || [];
  const items = (Array.isArray(links) ? links : []).map((url) => ({ id: String(url), name: String(url), url: String(url), result_json: utils.compactJson({ url }) }));
  return { ok: true, items, totalCount: items.length, nextCursor: "" };
} };
