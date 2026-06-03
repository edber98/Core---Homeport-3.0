const { utils } = require("./utils");
module.exports = { async replicate_prediction_get(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.predictionId) return { ok: false, error: "ID prédiction requis." };
  const res = await utils.replicateRequest(opts, `/predictions/${encodeURIComponent(String(d.predictionId))}`);
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: res.data?.id || "", status: res.data?.status || "", url: res.data?.urls?.get || "", text: Array.isArray(res.data?.output) ? res.data.output.join("\n") : "", result_json: utils.compactJson(res.data) };
} };
