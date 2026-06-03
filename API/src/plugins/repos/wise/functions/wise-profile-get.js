const { utils } = require("./utils");
module.exports = { async wise_profile_get(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.profileId) return { ok: false, error: "profileId requis." };
  const res = await utils.wiseRequest(opts, `/v2/profiles/${encodeURIComponent(String(d.profileId))}`, { method: "GET" });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const r = res.data || {};
  return { ok: true, id: String(r.id || d.profileId), name: r.fullName || r.name || "", status: r.type || "", text: r.details ? JSON.stringify(r.details) : "", result_json: utils.compactJson(res.data) };
}};
