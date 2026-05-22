const { utils } = require("./utils");
module.exports = { async replicate_model_get(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.owner || !d.model) return { ok: false, error: "Propriétaire et modèle requis." };
  const res = await utils.replicateRequest(opts, `/models/${encodeURIComponent(String(d.owner))}/${encodeURIComponent(String(d.model))}`);
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: res.data?.url || `${d.owner}/${d.model}`, name: res.data?.name || d.model, url: res.data?.url || "", text: res.data?.description || "", result_json: utils.compactJson(res.data) };
} };
