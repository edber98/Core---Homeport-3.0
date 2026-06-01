const { utils } = require("./utils");
module.exports = { async wise_recipient_get(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.recipientId) return { ok: false, error: "recipientId requis." };
  const res = await utils.wiseRequest(opts, `/v1/accounts/${encodeURIComponent(String(d.recipientId))}`, { method: "GET" });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const r = res.data || {};
  return { ok: true, id: String(r.id || d.recipientId), name: r.accountHolderName || "", status: r.type || "", text: r.currency || "", result_json: utils.compactJson(res.data) };
}};
