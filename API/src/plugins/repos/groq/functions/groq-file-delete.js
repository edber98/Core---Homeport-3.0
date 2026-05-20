const { utils } = require("./utils");
module.exports = { async groq_file_delete(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.fileId) return { ok: false, error: "ID fichier requis." };
  const res = await utils.groqRequest(opts, `/files/${encodeURIComponent(String(d.fileId))}`, { method: "DELETE" });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: d.fileId, status: res.data?.deleted ? "deleted" : "", result_json: utils.compactJson(res.data) };
} };
