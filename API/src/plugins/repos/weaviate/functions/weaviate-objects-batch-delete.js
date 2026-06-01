const { utils } = require("./utils");
module.exports = { async weaviate_objects_batch_delete(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.className || !d.whereFilter) return { ok: false, error: "className et whereFilter requis." };
  let where = d.whereFilter;
  if (typeof where !== "object") { try { where = JSON.parse(String(where)); } catch { return { ok: false, error: "whereFilter JSON invalide." }; } }
  const body = { match: { class: d.className, where } };
  const res = await utils.weaviateRequest(opts, `/v1/batch/objects`, { method: "DELETE", body });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, status: "deleted", result_json: utils.compactJson(res.data) };
}};
