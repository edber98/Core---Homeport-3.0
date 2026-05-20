const { utils } = require("./utils");
module.exports = { async cohere_classify_create(node, msg, inputs, opts) {
  const d = inputs || {};
  let inputsList, examples;
  try {
    inputsList = utils.parseJsonInput(d.inputs, "entrées", null);
    examples = utils.parseJsonInput(d.examples, "exemples", null);
  } catch (e) { return { ok: false, error: e.message }; }
  if (!Array.isArray(inputsList) || !inputsList.length) return { ok: false, error: "Entrées JSON requises." };
  if (!Array.isArray(examples) || !examples.length) return { ok: false, error: "Exemples JSON requis." };
  const body = { model: String(d.model || "embed-v4.0").trim(), inputs: inputsList, examples };
  const res = await utils.cohereRequest(opts, "/v2/classify", { method: "POST", body });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, status: "classified", name: body.model, text: String((res.data?.classifications || []).length), result_json: utils.compactJson(res.data) };
} };
