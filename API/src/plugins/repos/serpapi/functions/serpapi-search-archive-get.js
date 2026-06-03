const { utils } = require("./utils");
module.exports = { async serpapi_search_archive_get(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.searchId) return { ok: false, error: "ID recherche requis." };
  const output = d.output || "json";
  const res = await utils.serpapiRequest(opts, `/searches/${encodeURIComponent(String(d.searchId))}.${encodeURIComponent(String(output))}`);
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: d.searchId, status: res.data?.search_metadata?.status || "", name: res.data?.search_parameters?.q || "", text: res.data?.answer_box?.answer || "", result_json: utils.compactJson(res.data) };
} };
