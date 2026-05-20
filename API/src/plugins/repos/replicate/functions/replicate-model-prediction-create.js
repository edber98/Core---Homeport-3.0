const { utils } = require("./utils");
module.exports = { async replicate_model_prediction_create(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.owner || !d.model) return { ok: false, error: "Propriétaire et modèle requis." };
  let input;
  try { input = utils.parseJsonInput(d.input, "entrée", {}); } catch (e) { return { ok: false, error: e.message }; }
  const body = { input };
  if (d.webhook) body.webhook = String(d.webhook);
  const res = await utils.replicateRequest(opts, `/models/${encodeURIComponent(String(d.owner))}/${encodeURIComponent(String(d.model))}/predictions`, { method: "POST", body });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: res.data?.id || "", status: res.data?.status || "", url: res.data?.urls?.get || "", text: Array.isArray(res.data?.output) ? res.data.output.join("\n") : "", result_json: utils.compactJson(res.data) };
} };
