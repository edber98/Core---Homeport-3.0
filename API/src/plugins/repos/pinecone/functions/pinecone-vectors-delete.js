const { utils } = require("./utils");
module.exports = { async pinecone_vectors_delete(node, msg, inputs, opts) {
  const d = inputs || {};
  let ids;
  try { ids = utils.parseJsonInput(d.ids, "IDs", null); } catch (e) { return { ok: false, error: e.message }; }
  if (!Array.isArray(ids) || !ids.length) return { ok: false, error: "IDs JSON requis." };
  const body = { ids };
  if (d.namespace) body.namespace = String(d.namespace);
  const res = await utils.pineconeRequest(opts, "/vectors/delete", { method: "POST", body });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, status: "deleted", text: String(ids.length), result_json: utils.compactJson(res.data) };
} };
