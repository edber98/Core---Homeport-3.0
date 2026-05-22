const { utils } = require("./utils");
module.exports = { async groq_batch_get(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.batchId) return { ok: false, error: "ID batch requis." };
  const res = await utils.groqRequest(opts, `/batches/${encodeURIComponent(String(d.batchId))}`);
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: res.data?.id || d.batchId, status: res.data?.status || "", name: res.data?.endpoint || "", result_json: utils.compactJson(res.data) };
} };
