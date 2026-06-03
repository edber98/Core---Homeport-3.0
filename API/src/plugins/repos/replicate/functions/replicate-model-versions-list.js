const { utils } = require("./utils");

function itemFromUnknown(value, index = 0) {
  const r = value || {};
  return {
    id: String(r.id || r.key || r.url || index),
    name: r.name || r.title || r.model || r.url || "",
    status: r.status || r.state || "",
    url: r.url || r.link || "",
    result_json: utils.compactJson(r)
  };
}

module.exports = { async replicate_model_versions_list(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.owner || !d.model) return { ok: false, error: "Propriétaire et modèle requis." };
  const res = await utils.replicateRequest(opts, `/models/${encodeURIComponent(String(d.owner))}/${encodeURIComponent(String(d.model))}/versions`);
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const rawItems = Array.isArray(res.data?.results) ? res.data.results : [];
  const items = rawItems.map(itemFromUnknown);
  return { ok: true, items, totalCount: items.length, nextCursor: res.data?.next || "" };
} };
