const { utils } = require("./utils");
module.exports = { async vercel_env_delete(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.projectId) return { ok: false, error: "projectId requis." };
  if (!d.envId) return { ok: false, error: "envId requis." };
  const res = await utils.vercelRequest(opts, `/v9/projects/${encodeURIComponent(String(d.projectId))}/env/${encodeURIComponent(String(d.envId))}`, { method: "DELETE", query: { teamId: d.teamId }, body: {} });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: d.envId, status: "deleted", result_json: utils.compactJson(res.data) };
} };
