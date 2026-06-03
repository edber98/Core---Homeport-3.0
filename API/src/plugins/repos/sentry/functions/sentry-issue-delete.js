const { utils } = require("./utils");
module.exports = { async sentry_issue_delete(node, msg, inputs, opts) {
  const d = inputs || {};
  if (!d.issueId) return { ok: false, error: "issueId requis." };
  const res = await utils.sentryRequest(opts, `/issues/${encodeURIComponent(String(d.issueId))}/`, { method: "DELETE", body: {} });
  if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };
  return { ok: true, id: d.issueId, status: "deleted", result_json: utils.compactJson(res.data) };
} };
