const { utils } = require("./utils");
module.exports = { async replicate_prediction_cancel(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.predictionId) return { ok: false, error: "ID prédiction requis." };
  const res = await utils.replicateRequest(opts, `/predictions/${encodeURIComponent(String(d.predictionId))}/cancel`, { method: "POST", body: {} });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: res.data?.id || String(d.predictionId), status: res.data?.status || "canceled", result_json: utils.compactJson(res.data) };
} };
