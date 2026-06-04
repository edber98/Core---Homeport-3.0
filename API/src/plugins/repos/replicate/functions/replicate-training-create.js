const { utils } = require("./utils");
module.exports = { async replicate_training_create(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.owner || !d.model || !d.version) return { ok: false, error: "owner, model et version requis." };
  let input;
  try { input = utils.parseJsonInput(d.modelInput, "modelInput", {}); } catch (e) { return { ok: false, error: e.message }; }
  const body = { input };
  if (d.destination) body.destination = String(d.destination);
  if (d.webhook) body.webhook = String(d.webhook);
  const path = `/models/${encodeURIComponent(String(d.owner))}/${encodeURIComponent(String(d.model))}/versions/${encodeURIComponent(String(d.version))}/trainings`;
  const res = await utils.replicateRequest(opts, path, { method: "POST", body });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: res.data?.id || "", status: res.data?.status || "", name: res.data?.model || "", url: res.data?.urls?.get || "", result_json: utils.compactJson(res.data) };
} };
