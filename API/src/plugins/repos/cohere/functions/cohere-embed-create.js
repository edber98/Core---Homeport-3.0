const { utils } = require("./utils");
module.exports = { async cohere_embed_create(node, msg, inputs, opts) {
  const log = (opts && opts.log) ? opts.log : () => {};
  const d = inputs || {};
  let texts;
  try { texts = utils.parseJsonInput(d.texts, "textes", null); } catch (e) { return { ok: false, error: e.message }; }
  if (!Array.isArray(texts) || !texts.length) return { ok: false, error: "Textes JSON requis." };
  const body = { model: String(d.model || "embed-v4.0").trim(), texts, input_type: d.inputType || "search_document", embedding_types: ["float"] };
  log("Création des embeddings...");
  const res = await utils.cohereRequest(opts, "/v2/embed", { method: "POST", body });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const vectors = res.data?.embeddings?.float || res.data?.embeddings || [];
  return { ok: true, status: "created", name: body.model, text: String(Array.isArray(vectors) ? vectors.length : 0), result_json: utils.compactJson(res.data) };
} };
