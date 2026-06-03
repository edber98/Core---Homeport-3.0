const { utils } = require("./utils");
module.exports = { async replicate_training_get(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.trainingId) return { ok: false, error: "ID entraînement requis." };
  const res = await utils.replicateRequest(opts, `/trainings/${encodeURIComponent(String(d.trainingId))}`);
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: res.data?.id || "", status: res.data?.status || "", name: res.data?.model || "", url: res.data?.urls?.get || "", text: res.data?.logs || "", result_json: utils.compactJson(res.data) };
} };
