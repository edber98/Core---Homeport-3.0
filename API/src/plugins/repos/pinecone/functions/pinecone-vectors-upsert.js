const { utils } = require("./utils");
module.exports = { async pinecone_vectors_upsert(node, msg, inputs, opts) {
  const d = inputs || {};
  let vectors;
  try { vectors = utils.parseJsonInput(d.vectors, "vecteurs", null); } catch (e) { return { ok: false, error: e.message }; }
  if (!Array.isArray(vectors) || !vectors.length) return { ok: false, error: "Vecteurs JSON requis." };
  const body = { vectors };
  if (d.namespace) body.namespace = String(d.namespace);
  const res = await utils.pineconeRequest(opts, "/vectors/upsert", { method: "POST", body });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, status: "upserted", text: String(res.data?.upsertedCount || vectors.length), result_json: utils.compactJson(res.data) };
} };
