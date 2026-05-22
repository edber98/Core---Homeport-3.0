const { utils } = require("./utils");
module.exports = { async groq_file_upload(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.content) return { ok: false, error: "Contenu JSONL requis." };
  const form = new FormData();
  form.append("purpose", String(d.purpose || "batch"));
  form.append("file", new Blob([String(d.content)], { type: "application/jsonl" }), String(d.filename || "batch.jsonl"));
  const res = await utils.groqRequest(opts, "/files", { method: "POST", formData: form });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: res.data?.id || "", status: res.data?.status || "", name: res.data?.filename || "", result_json: utils.compactJson(res.data) };
} };
