const { utils } = require("./utils");
module.exports = { async elevenlabs_text_to_dialogue(node, msg, inputs, opts) {
  const d = inputs || {};
  let inputsList;
  try { inputsList = utils.parseJsonInput(d.inputs, "dialogue", null); } catch (e) { return { ok: false, error: e.message }; }
  if (!Array.isArray(inputsList) || !inputsList.length) return { ok: false, error: "Dialogue JSON requis." };
  const body = { inputs: inputsList };
  if (d.modelId) body.model_id = String(d.modelId);
  const res = await utils.elevenlabsRequest(opts, "/text-to-dialogue", { method: "POST", body, responseType: "arrayBuffer" });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, status: "generated", name: d.modelId || "", text: res.data.toString("base64"), result_json: utils.compactJson({ encoding: "base64", bytes: res.data.length }) };
} };
