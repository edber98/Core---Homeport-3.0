const { utils } = require("./utils");
module.exports = { async serpapi_search_run(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.query) return { ok: false, error: "Requête requise." };
  const res = await utils.serpapiRequest(opts, "/search.json", { query: { q: d.query, engine: d.engine || "google", location: d.location, hl: d.hl, gl: d.gl } });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: res.data?.search_metadata?.id || "", status: res.data?.search_metadata?.status || "", name: d.query, url: res.data?.search_metadata?.google_url || "", text: res.data?.answer_box?.answer || res.data?.answer_box?.snippet || "", result_json: utils.compactJson(res.data) };
} };
