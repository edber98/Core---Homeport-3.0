const { utils } = require("./utils");
module.exports = { async pinecone_index_stats_get(node, msg, inputs, opts) {
  const d = inputs || {};
  let filter;
  try { filter = utils.parseJsonInput(d.filter, "filtre", undefined); } catch (e) { return { ok: false, error: e.message }; }
  const body = {};
  if (filter) body.filter = filter;
  const res = await utils.pineconeRequest(opts, "/describe_index_stats", { method: "POST", body });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, status: "ok", text: String(res.data?.totalVectorCount || ""), result_json: utils.compactJson(res.data) };
} };
