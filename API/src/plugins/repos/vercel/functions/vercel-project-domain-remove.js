const { utils } = require("./utils");
module.exports = { async vercel_project_domain_remove(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.projectId) return { ok: false, error: "projectId requis." };
  if (!d.domain) return { ok: false, error: "domain requis." };
  const res = await utils.vercelRequest(opts, `/v9/projects/${encodeURIComponent(String(d.projectId))}/domains/${encodeURIComponent(String(d.domain))}`, { method: "DELETE", query: { teamId: d.teamId }, body: {} });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: d.domain, status: "removed", result_json: utils.compactJson(res.data) };
} };
