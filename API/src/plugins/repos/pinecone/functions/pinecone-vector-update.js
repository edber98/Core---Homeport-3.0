const { utils } = require("./utils");
module.exports = { async pinecone_vector_update(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.id) return { ok: false, error: "ID vecteur requis." };
  let values, metadata;
  try { values = utils.parseJsonInput(d.values, "valeurs", undefined); metadata = utils.parseJsonInput(d.metadata, "métadonnées", undefined); } catch (e) { return { ok: false, error: e.message }; }
  const body = { id: String(d.id) };
  if (Array.isArray(values)) body.values = values;
  if (metadata) body.setMetadata = metadata;
  if (d.namespace) body.namespace = String(d.namespace);
  const res = await utils.pineconeRequest(opts, "/vectors/update", { method: "POST", body });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: d.id, status: "updated", result_json: utils.compactJson(res.data) };
} };
