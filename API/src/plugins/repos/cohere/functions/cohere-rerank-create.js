const { utils } = require("./utils");
module.exports = { async cohere_rerank_create(node, msg, inputs, opts) {
  const log = (opts && opts.log) ? opts.log : () => {};
  const d = inputs || {};
  let documents;
  try { documents = utils.parseJsonInput(d.documents, "documents", null); } catch (e) { return { ok: false, error: e.message }; }
  if (!d.query) return { ok: false, error: "Requête requise." };
  if (!Array.isArray(documents) || !documents.length) return { ok: false, error: "Documents JSON requis." };
  const body = { model: String(d.model || "rerank-v3.5").trim(), query: String(d.query), documents };
  if (d.topN) body.top_n = parseInt(d.topN, 10);
  log("Réordonnancement...");
  const res = await utils.cohereRequest(opts, "/v2/rerank", { method: "POST", body });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, status: "ranked", name: body.model, text: String((res.data?.results || []).length), result_json: utils.compactJson(res.data) };
} };
