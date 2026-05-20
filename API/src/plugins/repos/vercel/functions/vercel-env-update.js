const { utils } = require("./utils");
module.exports = { async vercel_env_update(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.projectId) return { ok: false, error: "projectId requis." };
  if (!d.envId) return { ok: false, error: "envId requis." };
  if (d.value === undefined || d.value === "") return { ok: false, error: "value requis." };
  const res = await utils.vercelRequest(opts, `/v9/projects/${encodeURIComponent(String(d.projectId))}/env/${encodeURIComponent(String(d.envId))}`, { method: "PATCH", query: { teamId: d.teamId }, body: { value: String(d.value) } });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  const r = res.data || {};
  return { ok: true, id: r.id || d.envId, name: r.key || "", status: "updated", result_json: utils.compactJson(res.data) };
} };
